import { PipelineStageInfo, Keypoint, MatchPair, AlignmentMetrics } from '../types/correspondence';

export const PIPELINE_STAGES: PipelineStageInfo[] = [
  {
    id: '01_PAIR_FORMATION',
    stageNumber: '01',
    scientificTitle: 'Pair Formation & Ingestion',
    explainTitle: 'Load Observation Pair',
    scientificDescription: 'Ingests orbital observation metadata, sensor ephemeris, camera geometry matrices, and establishes initial overlapping bounding footprints.',
    explainDescription: 'The system selects two satellite photos of the lunar surface and verifies that their viewing areas overlap.',
    algorithm: 'IAU/IAG Selenographic Coordinate Footprint Intersector',
    parameters: { footprintIntersection: '84.2%', coordinateDatum: 'Mean Earth/Polar Axis (ME)' },
    status: 'completed'
  },
  {
    id: '02_PREPROCESSING',
    stageNumber: '02',
    scientificTitle: 'Sensor & Physics-Aware Preprocessing',
    explainTitle: 'Calibrate & Balance Lighting',
    scientificDescription: 'Non-Local Means (NLM) de-striping, dark-signal non-uniformity (DSNU) normalization, and Rayleigh-distributed CLAHE to reveal micro-relief inside polar shadows.',
    explainDescription: 'Removes camera sensor lines and brightens deep crater shadows so rock features become clear without blowing out sunny ridges.',
    algorithm: 'NLM Denoising + CLAHE (Tile Grid: 16x16, Clip Limit: 3.2)',
    parameters: { clipLimit: 3.2, tilesX: 16, tilesY: 16, filterWindow: '7x7' },
    status: 'completed'
  },
  {
    id: '03_PAIR_CHARACTERIZATION',
    stageNumber: '03',
    scientificTitle: 'Pair Characterization & Difficulty Estimation',
    explainTitle: 'Diagnose Pair Difficulty',
    scientificDescription: 'Evaluates ground sampling distance ratio (GSD), multi-spectral modality gap, solar illumination difference, texture entropy, and determines overall pair difficulty.',
    explainDescription: 'The system checks how different the two photos are in zoom level, camera type, and sun angle to rate difficulty (Easy / Medium / Hard).',
    algorithm: 'Multi-Factor Remote-Sensing Difficulty Estimator',
    parameters: { gsdDisparityRatio: '20:1', modalityGap: 'Panchromatic vs Stereo', difficulty: 'Medium' },
    status: 'completed'
  },
  {
    id: '04_ADAPTIVE_ROUTER',
    stageNumber: '04',
    scientificTitle: 'Adaptive Model Router & Strategy Selection',
    explainTitle: 'Select Best Matching Tool',
    scientificDescription: 'Ranks model bank candidates (RIFT, HOPC, CFOG, SuperPoint+LightGlue, LoFTR, SIFT) and selects the optimal structural or feature matching engine.',
    explainDescription: 'Instead of forcing the same matching algorithm on every photo, PARALLAX picks the model best equipped for this specific pair.',
    algorithm: 'Pair-Aware Model Scoring & Strategy Selection Heuristic',
    parameters: { rankedTopCandidate: 'RIFT (Phase Congruency)', suitabilityScore: 96, confidenceMargin: '+12%' },
    status: 'completed'
  },
  {
    id: '05_CORRESPONDENCE',
    stageNumber: '05',
    scientificTitle: 'Feature Extraction & Candidate Matching',
    explainTitle: 'Extract & Pair Up Landmarks',
    scientificDescription: 'Executes the selected correspondence strategy (Log-Gabor phase congruency / scale-space pyramids) with nearest-neighbor indexing and ambiguity ratio tests.',
    explainDescription: 'Finds unique landmarks (crater edges, boulders, ridge bends) in both images and pairs them up with fingerprint matching.',
    algorithm: 'Phase Congruency Feature Mapping + Mutual Ratio Filtering',
    parameters: { rawExtracted: 420, initialCandidates: 20, ratioThreshold: 0.72 },
    status: 'completed'
  },
  {
    id: '06_RANSAC_VERIFICATION',
    stageNumber: '06',
    scientificTitle: 'Robust Geometric Verification (MSAC / RANSAC)',
    explainTitle: 'Filter False Matches with Geometry',
    scientificDescription: 'M-estimator Sample Consensus (MSAC) testing 2,000 transformation hypotheses with 2.5 px reprojection threshold to eliminate false matches caused by migrating shadows.',
    explainDescription: 'Tests thousands of geometric formulas to find the single real perspective connecting true matches, throwing away misleading shadows.',
    algorithm: 'USAC / MSAC Projective Consensus (Max Iter: 2000)',
    parameters: { maxIterations: 2000, reprojectionThreshold: 2.5, inliersIsolated: 16, outliersPruned: 4 },
    status: 'completed'
  },
  {
    id: '07_SPATIAL_ANMS',
    stageNumber: '07',
    scientificTitle: 'Spatial Distribution & ANMS Enforcement',
    explainTitle: 'Spread Out Landmarks Evenly',
    scientificDescription: 'Adaptive Non-Maximal Suppression (ANMS) enforces global spatial dispersion across the image footprint, preventing unstable point clustering on single crater rims.',
    explainDescription: 'Ensures landmarks are spread evenly across the whole scene rather than clumped in one tiny corner, making the alignment stable.',
    algorithm: 'Brown-Szeliski Adaptive Non-Maximal Suppression (ANMS)',
    parameters: { spatialCoverage: '74.2%', suppressionRadius: '120 px', retainedDistributedPoints: 12 },
    status: 'completed'
  },
  {
    id: '08_SUBPIXEL_REFINEMENT',
    stageNumber: '08',
    scientificTitle: 'Sub-Pixel Local Refinement (ECC)',
    explainTitle: 'Fine-Tune Alignment to Fractions of a Pixel',
    scientificDescription: 'Enhanced Correlation Coefficient (ECC) optimization iteratively adjusts projective matrix H coordinates to achieve sub-pixel spatial convergence.',
    explainDescription: 'Fine-tunes the mathematical alignment down to fractions of a single camera pixel for pinpoint accuracy.',
    algorithm: 'Enhanced Correlation Coefficient (ECC) Non-Linear Optimizer',
    parameters: { convergenceDelta: '1e-5', maxIterations: 50, finalRmsePx: 1.28 },
    status: 'completed'
  },
  {
    id: '09_QUALITY_UNCERTAINTY',
    stageNumber: '09',
    scientificTitle: 'Quality Assessment & Uncertainty Quantification',
    explainTitle: 'Evaluate Alignment Trustworthiness',
    scientificDescription: 'Computes reprojection RMSE (1.28 px), 1-sigma uncertainty bounds (±0.14 px), inlier ratio (80.0%), and validates against target quality gates.',
    explainDescription: 'Checks whether the mathematical alignment passes quality safety standards before declaring success.',
    algorithm: 'Covariance-Based Uncertainty Estimator & Quality Gate Verifier',
    parameters: { qualityStatus: 'PASSED', targetThresholdMet: '< 1.5 px', uncertainty1Sigma: '±0.14 px' },
    status: 'completed'
  },
  {
    id: '10_REGISTERED_OUTPUT',
    stageNumber: '10',
    scientificTitle: 'Orthorectified Co-Registered Output',
    explainTitle: 'Final Aligned Product Ready',
    scientificDescription: 'Generates warp-registered multi-sensor composite with pixel-accurate correspondence vectors ready for DEM projection and mineralogical mapping.',
    explainDescription: 'The two satellite images are now geometrically locked onto the exact same lunar terrain with subpixel accuracy.',
    algorithm: 'Bilinear Projective Image Warper & Composite Generator',
    parameters: { registeredDimensions: '4096 x 4096', projectionFrame: 'IAU Moon 2000' },
    status: 'completed'
  }
];

// Normalized feature points (0 - 100% coordinates on each image)
export const MOCK_SOURCE_KEYPOINTS: Keypoint[] = [
  { id: 1, x: 22.4, y: 28.1, scale: 2.1, orientation: 42, response: 0.88, instrument: 'OHRC', isAnmsSelected: true },
  { id: 2, x: 38.6, y: 22.8, scale: 3.4, orientation: 120, response: 0.94, instrument: 'OHRC', isAnmsSelected: true },
  { id: 3, x: 54.2, y: 19.5, scale: 1.8, orientation: 85, response: 0.76, instrument: 'OHRC', isAnmsSelected: false },
  { id: 4, x: 71.0, y: 26.3, scale: 2.5, orientation: 310, response: 0.82, instrument: 'OHRC', isAnmsSelected: true },
  { id: 5, x: 18.2, y: 46.5, scale: 3.0, orientation: 15, response: 0.91, instrument: 'OHRC', isAnmsSelected: true },
  { id: 6, x: 34.7, y: 44.2, scale: 4.1, orientation: 178, response: 0.99, instrument: 'OHRC', isAnmsSelected: true },
  { id: 7, x: 52.8, y: 41.0, scale: 2.2, orientation: 220, response: 0.85, instrument: 'OHRC', isAnmsSelected: false },
  { id: 8, x: 68.4, y: 48.9, scale: 3.6, orientation: 95, response: 0.89, instrument: 'OHRC', isAnmsSelected: true },
  { id: 9, x: 82.5, y: 42.1, scale: 1.9, orientation: 140, response: 0.73, instrument: 'OHRC', isAnmsSelected: true },
  { id: 10, x: 25.1, y: 68.4, scale: 2.7, orientation: 60, response: 0.84, instrument: 'OHRC', isAnmsSelected: true },
  { id: 11, x: 41.8, y: 65.0, scale: 3.8, orientation: 290, response: 0.96, instrument: 'OHRC', isAnmsSelected: false },
  { id: 12, x: 58.6, y: 62.7, scale: 2.0, orientation: 18, response: 0.79, instrument: 'OHRC', isAnmsSelected: true },
  { id: 13, x: 74.3, y: 69.1, scale: 3.2, orientation: 205, response: 0.92, instrument: 'OHRC', isAnmsSelected: true },
  { id: 14, x: 30.5, y: 84.2, scale: 2.4, orientation: 75, response: 0.81, instrument: 'OHRC', isAnmsSelected: true },
  { id: 15, x: 48.0, y: 81.6, scale: 4.5, orientation: 330, response: 0.97, instrument: 'OHRC', isAnmsSelected: false },
  { id: 16, x: 65.2, y: 86.0, scale: 2.3, orientation: 112, response: 0.87, instrument: 'OHRC', isAnmsSelected: true },
  // Outliers (spurious or mismatched shadows)
  { id: 17, x: 12.0, y: 15.0, scale: 1.5, orientation: 20, response: 0.65, instrument: 'OHRC', isAnmsSelected: false },
  { id: 18, x: 88.0, y: 22.0, scale: 1.6, orientation: 45, response: 0.62, instrument: 'OHRC', isAnmsSelected: false },
  { id: 19, x: 15.0, y: 88.0, scale: 1.4, orientation: 180, response: 0.58, instrument: 'OHRC', isAnmsSelected: false },
  { id: 20, x: 85.0, y: 88.0, scale: 1.7, orientation: 210, response: 0.69, instrument: 'OHRC', isAnmsSelected: false },
];

export const MOCK_TARGET_KEYPOINTS: Keypoint[] = [
  // Slightly shifted, scaled, and rotated according to TMC-2 perspective
  { id: 1, x: 24.8, y: 29.5, scale: 2.0, orientation: 45, response: 0.86, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 2, x: 40.5, y: 24.1, scale: 3.2, orientation: 122, response: 0.92, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 3, x: 55.7, y: 20.8, scale: 1.7, orientation: 87, response: 0.74, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 4, x: 72.1, y: 27.5, scale: 2.4, orientation: 312, response: 0.80, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 5, x: 20.9, y: 47.6, scale: 2.9, orientation: 17, response: 0.89, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 6, x: 37.1, y: 45.1, scale: 3.9, orientation: 180, response: 0.98, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 7, x: 54.8, y: 42.0, scale: 2.1, orientation: 222, response: 0.83, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 8, x: 70.1, y: 49.8, scale: 3.4, orientation: 97, response: 0.87, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 9, x: 83.9, y: 43.0, scale: 1.8, orientation: 142, response: 0.71, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 10, x: 27.8, y: 69.2, scale: 2.6, orientation: 62, response: 0.82, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 11, x: 44.2, y: 65.8, scale: 3.6, orientation: 292, response: 0.94, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 12, x: 60.5, y: 63.4, scale: 1.9, orientation: 20, response: 0.77, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 13, x: 75.9, y: 69.8, scale: 3.0, orientation: 207, response: 0.90, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 14, x: 33.2, y: 84.8, scale: 2.3, orientation: 77, response: 0.79, instrument: 'TMC-2', isAnmsSelected: true },
  { id: 15, x: 50.4, y: 82.2, scale: 4.3, orientation: 332, response: 0.95, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 16, x: 67.3, y: 86.5, scale: 2.2, orientation: 114, response: 0.85, instrument: 'TMC-2', isAnmsSelected: true },
  // Spurious / mismatched target points
  { id: 17, x: 80.0, y: 15.0, scale: 1.5, orientation: 180, response: 0.60, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 18, x: 20.0, y: 18.0, scale: 1.6, orientation: 90, response: 0.61, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 19, x: 82.0, y: 78.0, scale: 1.4, orientation: 0, response: 0.55, instrument: 'TMC-2', isAnmsSelected: false },
  { id: 20, x: 25.0, y: 85.0, scale: 1.7, orientation: 315, response: 0.63, instrument: 'TMC-2', isAnmsSelected: false },
];

export const MOCK_MATCH_PAIRS: MatchPair[] = [
  // 16 Verified Inliers (12 selected by ANMS for uniform dispersion, 4 suppressed in clusters)
  { id: 1, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[0], targetKeypoint: MOCK_TARGET_KEYPOINTS[0], distance: 0.18, confidence: 0.96, isRansacInlier: true, isAnmsSelected: true, residualError: 0.84 },
  { id: 2, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[1], targetKeypoint: MOCK_TARGET_KEYPOINTS[1], distance: 0.12, confidence: 0.98, isRansacInlier: true, isAnmsSelected: true, residualError: 0.62 },
  { id: 3, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[2], targetKeypoint: MOCK_TARGET_KEYPOINTS[2], distance: 0.24, confidence: 0.91, isRansacInlier: true, isAnmsSelected: false, residualError: 1.12 },
  { id: 4, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[3], targetKeypoint: MOCK_TARGET_KEYPOINTS[3], distance: 0.19, confidence: 0.95, isRansacInlier: true, isAnmsSelected: true, residualError: 0.91 },
  { id: 5, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[4], targetKeypoint: MOCK_TARGET_KEYPOINTS[4], distance: 0.15, confidence: 0.97, isRansacInlier: true, isAnmsSelected: true, residualError: 0.73 },
  { id: 6, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[5], targetKeypoint: MOCK_TARGET_KEYPOINTS[5], distance: 0.08, confidence: 0.99, isRansacInlier: true, isAnmsSelected: true, residualError: 0.41 },
  { id: 7, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[6], targetKeypoint: MOCK_TARGET_KEYPOINTS[6], distance: 0.21, confidence: 0.93, isRansacInlier: true, isAnmsSelected: false, residualError: 0.98 },
  { id: 8, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[7], targetKeypoint: MOCK_TARGET_KEYPOINTS[7], distance: 0.16, confidence: 0.96, isRansacInlier: true, isAnmsSelected: true, residualError: 0.77 },
  { id: 9, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[8], targetKeypoint: MOCK_TARGET_KEYPOINTS[8], distance: 0.26, confidence: 0.89, isRansacInlier: true, isAnmsSelected: true, residualError: 1.35 },
  { id: 10, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[9], targetKeypoint: MOCK_TARGET_KEYPOINTS[9], distance: 0.17, confidence: 0.95, isRansacInlier: true, isAnmsSelected: true, residualError: 0.81 },
  { id: 11, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[10], targetKeypoint: MOCK_TARGET_KEYPOINTS[10], distance: 0.10, confidence: 0.98, isRansacInlier: true, isAnmsSelected: false, residualError: 0.52 },
  { id: 12, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[11], targetKeypoint: MOCK_TARGET_KEYPOINTS[11], distance: 0.22, confidence: 0.92, isRansacInlier: true, isAnmsSelected: true, residualError: 1.04 },
  { id: 13, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[12], targetKeypoint: MOCK_TARGET_KEYPOINTS[12], distance: 0.14, confidence: 0.97, isRansacInlier: true, isAnmsSelected: true, residualError: 0.69 },
  { id: 14, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[13], targetKeypoint: MOCK_TARGET_KEYPOINTS[13], distance: 0.20, confidence: 0.94, isRansacInlier: true, isAnmsSelected: true, residualError: 0.95 },
  { id: 15, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[14], targetKeypoint: MOCK_TARGET_KEYPOINTS[14], distance: 0.09, confidence: 0.99, isRansacInlier: true, isAnmsSelected: false, residualError: 0.44 },
  { id: 16, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[15], targetKeypoint: MOCK_TARGET_KEYPOINTS[15], distance: 0.18, confidence: 0.95, isRansacInlier: true, isAnmsSelected: true, residualError: 0.86 },
  // 4 Outliers (filtered by RANSAC due to severe geometric skew or shadow elongation)
  { id: 17, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[16], targetKeypoint: MOCK_TARGET_KEYPOINTS[16], distance: 0.68, confidence: 0.42, isRansacInlier: false, isAnmsSelected: false, residualError: 14.8 },
  { id: 18, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[17], targetKeypoint: MOCK_TARGET_KEYPOINTS[17], distance: 0.72, confidence: 0.38, isRansacInlier: false, isAnmsSelected: false, residualError: 19.2 },
  { id: 19, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[18], targetKeypoint: MOCK_TARGET_KEYPOINTS[18], distance: 0.64, confidence: 0.46, isRansacInlier: false, isAnmsSelected: false, residualError: 16.5 },
  { id: 20, sourceKeypoint: MOCK_SOURCE_KEYPOINTS[19], targetKeypoint: MOCK_TARGET_KEYPOINTS[19], distance: 0.75, confidence: 0.35, isRansacInlier: false, isAnmsSelected: false, residualError: 22.1 },
];

export const MOCK_ALIGNMENT_METRICS: AlignmentMetrics = {
  totalFeaturesSource: 542,
  totalFeaturesTarget: 418,
  candidateMatches: 20,
  inlierMatches: 16,
  outlierMatches: 4,
  inlierRatio: 80.0,
  rmse: 1.28,
  uncertaintyPx: 0.14, // 1-sigma uncertainty bound (+/- 0.14 px)
  precision: 92.4,
  recall: 85.6,
  f1Score: 0.888,
  spatialCoverage: 74.2, // ANMS spatial dispersion coverage
  confidenceScore: 88.5,
  qualityGateStatus: 'PASSED',
  evidenceType: 'MEASURED_BENCHMARK',
  selectedModelName: 'RIFT (Phase Congruency)',
  tmcBridgeActive: false,
  homographyMatrix: [
    [1.042, -0.018, 14.2],
    [0.015,  1.038,  8.6],
    [0.0001, 0.00005, 1.0]
  ],
  processingTimeMs: 384,
  isBackendLive: false // Clearly labeled as CALIBRATED BENCHMARK DEMO RESULT
};
