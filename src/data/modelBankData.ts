import { InstrumentId } from '../types/instruments';
import { LunarRegion } from '../types/regions';
import { SimulationParams } from '../types/state';
import { ModelCandidate, ModelId, PairCharacterization } from '../types/correspondence';

export const CANDIDATE_MODELS: Record<ModelId, Omit<ModelCandidate, 'suitabilityScore' | 'rank' | 'isRecommended' | 'selectionRationale'>> = {
  'RIFT': {
    id: 'RIFT',
    name: 'RIFT (Radiation-variation Insensitive Feature Transform)',
    category: 'Phase Congruency',
    description: 'Constructs maximum index maps from Log-Gabor phase congruency, achieving invariance to extreme non-linear radiometric differences and shifting shadow boundaries.',
    strengths: [
      'Invariance to extreme solar illumination and polar shadow changes',
      'Effective across heterogeneous spectral bands (Panchromatic vs SWIR)',
      'Constructs structural phase-congruency orientation layers'
    ],
    weaknesses: [
      'Higher computational overhead for Log-Gabor filter convolutions',
      'Requires substantial local gradient energy on smooth lunar regolith'
    ]
  },
  'HOPC': {
    id: 'HOPC',
    name: 'HOPC (Histogram of Orientated Phase Congruency)',
    category: 'Structural',
    description: 'Captures structural geometry from multi-scale and multi-orientation phase congruency representations rather than raw pixel intensities.',
    strengths: [
      'Robust against multi-modal contrast inversions and glancing solar angles',
      'Excellent performance on high-relief crater walls and ridgelines'
    ],
    weaknesses: [
      'Susceptible to octave scale aliasing beyond 15:1 GSD gap without scale-space pre-pyramids',
      'Sensitive to high-frequency sensor noise'
    ]
  },
  'CFOG': {
    id: 'CFOG',
    name: 'CFOG (Channel Features of Orientated Gradients)',
    category: 'Gradient',
    description: 'Fast pixel-wise 3D orientation gradient channels with 3D Gaussian convolution for cross-modality remote-sensing image registration.',
    strengths: [
      'Extremely fast dense matching execution (sub-150 ms)',
      'Effective for Moderate difficulty pairs with identical or near-visible spectral bands'
    ],
    weaknesses: [
      'Struggles when solar elevation causes extensive shadow migration (> 25° shadow shift)',
      'Requires significant initial spatial overlap (> 65%)'
    ]
  },
  'SUPERPOINT_LIGHTGLUE': {
    id: 'SUPERPOINT_LIGHTGLUE',
    name: 'SuperPoint + LightGlue (Learned Keypoints & Graph Matching)',
    category: 'Learned Feature',
    description: 'Deep self-supervised keypoint extractor combined with adaptive positional and visual graph neural network attention for resilient correspondence.',
    strengths: [
      'Sub-pixel landmark localization on repetitive crater regolith',
      'Adaptive early-exit matching rejecting impossible candidates with high confidence',
      'Resilient to moderate scale disparities (up to 8:1)'
    ],
    weaknesses: [
      'Pretrained weights require domain adaptation on crater ejecta and low-sun lunar imagery',
      'Inference requires GPU acceleration for real-time throughput'
    ]
  },
  'LOFTR': {
    id: 'LOFTR',
    name: 'LoFTR (Detector-Free Local Feature Matching with Transformers)',
    category: 'Dense Matching',
    description: 'Coarse-to-fine transformer matching using self- and cross-attention without relying on discrete keypoint detection, ideal for low-texture regions.',
    strengths: [
      'Finds dense matches inside low-texture crater basins and washed-out terrain',
      'Global receptive field maintains spatial context across wide gaps'
    ],
    weaknesses: [
      'Computationally heavy memory footprint on large remote-sensing orbital swaths',
      'Quadratic complexity requires tiling on full 4096-wide OHRC strips'
    ]
  },
  'SIFT': {
    id: 'SIFT',
    name: 'SIFT (Scale-Invariant Feature Transform — Classical Baseline)',
    category: 'Classical Baseline',
    description: 'Standard planetary remote-sensing baseline utilizing Difference-of-Gaussians (DoG) scale-space extrema and 128-D gradient orientation histograms.',
    strengths: [
      'Mathematically proven scale-space invariance for mild to moderate GSD ratios',
      'Deterministic execution and low memory consumption',
      'Ideal reference baseline to quantify adaptive improvements'
    ],
    weaknesses: [
      'Completely fails under severe radiometric contrast inversion (optical vs hyperspectral)',
      'Tracks moving shadow edges instead of geological rock under shifting solar angles'
    ]
  }
};

/**
 * Characterize an image pair and evaluate candidate correspondence models.
 * This embodies the central PARALLAX idea:
 * "Different image pair -> different difficulty -> different suitable correspondence strategy."
 */
export function evaluatePair(
  source: InstrumentId,
  target: InstrumentId,
  region: LunarRegion,
  simParams?: SimulationParams
): {
  characterization: PairCharacterization;
  rankedCandidates: ModelCandidate[];
  selectedModel: ModelCandidate;
} {
  // 1. Determine Scale Ratio
  let scaleRatio = 1;
  let scaleRatioDisplay = '1:1';
  if ((source === 'OHRC' && target === 'TMC-2') || (source === 'TMC-2' && target === 'OHRC')) {
    scaleRatio = simParams ? simParams.spatialScaleRatio : 20;
    scaleRatioDisplay = `${scaleRatio}:1`;
  } else if ((source === 'OHRC' && target === 'IIRS') || (source === 'IIRS' && target === 'OHRC')) {
    scaleRatio = 320;
    scaleRatioDisplay = '320:1';
  } else if ((source === 'TMC-2' && target === 'IIRS') || (source === 'IIRS' && target === 'TMC-2')) {
    scaleRatio = 16;
    scaleRatioDisplay = '16:1';
  } else {
    scaleRatio = 1;
    scaleRatioDisplay = '1:1';
  }

  // 2. Modality Difference
  let modalityDifference: 'Low' | 'Moderate' | 'Severe' = 'Low';
  if ((source === 'OHRC' && target === 'TMC-2') || (source === 'TMC-2' && target === 'OHRC')) {
    modalityDifference = 'Low'; // Both are visible/panchromatic optical
  } else if ((source === 'TMC-2' && target === 'IIRS') || (source === 'IIRS' && target === 'TMC-2')) {
    modalityDifference = 'Moderate'; // Panchromatic visible stereo vs 256-band IR
  } else if ((source === 'OHRC' && target === 'IIRS') || (source === 'IIRS' && target === 'OHRC')) {
    modalityDifference = 'Severe'; // 0.25m ultra-fine visible vs 80m 256-band hyperspectral
  }

  // 3. Illumination Difference (influenced by region and simParams)
  let illuminationDifference: 'Minimal' | 'Moderate' | 'Extreme' = 'Moderate';
  const sunElev = simParams ? simParams.sunElevationAngle : (region.id === 'faustini-crater' ? 3.2 : region.id === 'shackleton-connecting-ridge' ? 1.5 : 18);
  if (sunElev < 6) {
    illuminationDifference = 'Extreme'; // Polar glancing sun with massive shifting shadows
  } else if (sunElev < 25) {
    illuminationDifference = 'Moderate';
  } else {
    illuminationDifference = 'Minimal';
  }

  // 4. Overlap & Texture
  const textureEntropy = region.id === 'tycho-central-peak' ? 7.4 : region.id === 'faustini-crater' ? 5.9 : 6.8;
  const estimatedOverlap = scaleRatio > 100 ? 52 : scaleRatio > 10 ? 84 : 95;
  const validPixelRatio = region.id === 'faustini-crater' ? 78.5 : 96.2;
  const viewpointGeometryDiff = (source === 'TMC-2' || target === 'TMC-2') ? 'Moderate Triplet' : 'Near-Nadir';

  // 5. Overall Difficulty Assessment
  let overallDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  let difficultyRationale = '';
  let suggestTmcBridge = false;

  if (scaleRatio >= 100 || (modalityDifference === 'Severe' && illuminationDifference === 'Extreme')) {
    overallDifficulty = 'Hard';
    suggestTmcBridge = true;
    difficultyRationale = 'Extreme 320:1 scale disparity combined with optical vs. hyperspectral radiometric divergence. Direct matching has very low confidence; conditional intermediate TMC-2 scale bridge is strongly recommended.';
  } else if (scaleRatio >= 15 || illuminationDifference === 'Extreme' || modalityDifference === 'Moderate') {
    overallDifficulty = 'Medium';
    suggestTmcBridge = false;
    difficultyRationale = 'Multi-scale octave gap (20:1) with significant polar shadow morphology. Requires phase-congruency or structural gradient representations with scale-space pyramids.';
  } else {
    overallDifficulty = 'Easy';
    suggestTmcBridge = false;
    difficultyRationale = 'Near-identical scale and modality with high geometric overlap. Standard gradient or learned sparse keypoint matchers converge with sub-pixel precision.';
  }

  // 6. Score and Rank Candidate Models based on pair characteristics
  const candidates: ModelCandidate[] = (Object.keys(CANDIDATE_MODELS) as ModelId[]).map((id) => {
    const base = CANDIDATE_MODELS[id];
    let score = 50;
    let rationale = '';

    if (id === 'RIFT') {
      if (illuminationDifference === 'Extreme' || modalityDifference === 'Severe') {
        score = 96;
        rationale = 'Ranked #1: Log-Gabor phase congruency is invariant to extreme polar shadow elongation and visible-to-infrared radiometric disparity.';
      } else if (modalityDifference === 'Moderate') {
        score = 88;
        rationale = 'Highly suited: Robust structural mapping bridges multi-spectral differences effectively.';
      } else {
        score = 82;
        rationale = 'Effective structural matcher, though classical or learned methods may execute faster for easy pairs.';
      }
    } else if (id === 'HOPC') {
      if (illuminationDifference === 'Extreme') {
        score = 92;
        rationale = 'Ranked high: Histogram of phase congruency preserves rim edges under glancing polar sunlight.';
      } else if (modalityDifference === 'Moderate') {
        score = 84;
        rationale = 'Strong structural representation across differing camera spectral responses.';
      } else {
        score = 75;
        rationale = 'Reliable structural candidate; moderate computational cost.';
      }
    } else if (id === 'SUPERPOINT_LIGHTGLUE') {
      if (overallDifficulty === 'Easy' || (overallDifficulty === 'Medium' && illuminationDifference !== 'Extreme')) {
        score = 94;
        rationale = 'Ranked #1: Deep graph neural network attention achieves exceptional sub-pixel localization on fine lunar crater regolith.';
      } else if (scaleRatio > 50) {
        score = 68;
        rationale = 'Sub-pixel accuracy is high, but extreme scale disparity degrades sparse interest point repeatability.';
      } else {
        score = 80;
        rationale = 'Strong candidate with adaptive early-exit pruning for false matches.';
      }
    } else if (id === 'LOFTR') {
      if (region.id === 'faustini-crater' || textureEntropy < 6.2) {
        score = 89;
        rationale = 'Detector-free dense transformer attention extracts correspondences within dark crater shadows and low-texture plains.';
      } else if (scaleRatio > 50) {
        score = 72;
        rationale = 'Coarse-to-fine attention helps, but large scale disparity requires octave downsampling.';
      } else {
        score = 78;
        rationale = 'Dense coverage eliminates keypoint detector dropouts in uniform lunar terrain.';
      }
    } else if (id === 'CFOG') {
      if (overallDifficulty === 'Easy' && modalityDifference === 'Low') {
        score = 91;
        rationale = 'Ranked top tier: 3D Gaussian orientation channels offer rapid, highly accurate registration for near-visible pairs.';
      } else if (illuminationDifference === 'Extreme') {
        score = 62;
        rationale = 'Orientation gradients can be corrupted by shifting high-contrast crater shadows.';
      } else {
        score = 76;
        rationale = 'Fast gradient-based candidate suitable for moderate scale ratios.';
      }
    } else if (id === 'SIFT') {
      if (overallDifficulty === 'Easy' && modalityDifference === 'Low' && illuminationDifference === 'Minimal') {
        score = 86;
        rationale = 'Reliable classical baseline with fast DoG scale-space octave filtering.';
      } else if (modalityDifference === 'Severe' || illuminationDifference === 'Extreme') {
        score = 42;
        rationale = 'Classical SIFT fails under non-linear radiometric shifts and tracks migrating shadows rather than surface topography.';
      } else {
        score = 65;
        rationale = 'Operates as reference baseline; secondary to phase-congruency and learned strategies.';
      }
    }

    // Apply simulation parameters adjustment
    if (simParams) {
      if (simParams.sensorNoiseSigma > 10) {
        if (id === 'LOFTR' || id === 'SUPERPOINT_LIGHTGLUE') score += 6;
        if (id === 'SIFT' || id === 'CFOG') score -= 8;
      }
    }

    return {
      ...base,
      suitabilityScore: Math.min(99, Math.max(20, score)),
      rank: 0,
      isRecommended: false,
      selectionRationale: rationale
    };
  });

  // Sort descending by suitability score
  candidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  candidates.forEach((c, idx) => {
    c.rank = idx + 1;
    c.isRecommended = idx === 0;
  });

  return {
    characterization: {
      scaleRatio,
      scaleRatioDisplay,
      modalityDifference,
      illuminationDifference,
      textureEntropy,
      estimatedOverlap,
      validPixelRatio,
      viewpointGeometryDiff,
      overallDifficulty,
      difficultyRationale,
      suggestTmcBridge
    },
    rankedCandidates: candidates,
    selectedModel: candidates[0]
  };
}
