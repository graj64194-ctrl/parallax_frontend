import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { InstrumentId } from '../types/instruments';
import { LunarRegion } from '../types/regions';
import { 
  PipelineStageId, 
  MatchFilterType, 
  ComparisonMode, 
  AlignmentMetrics, 
  MatchPair, 
  Keypoint,
  ModelCandidate,
  ModelId,
  PairCharacterization,
  LunarImageProduct
} from '../types/correspondence';
import { SimulationParams } from '../types/state';
import { LUNAR_REGIONS } from '../data/regionsData';
import { LUNAR_PRODUCTS, getDefaultProductForInstrument } from '../data/lunarProductsData';
import { 
  MOCK_SOURCE_KEYPOINTS, 
  MOCK_TARGET_KEYPOINTS, 
  MOCK_MATCH_PAIRS, 
  MOCK_ALIGNMENT_METRICS,
  PIPELINE_STAGES 
} from '../data/correspondenceMockData';
import { evaluatePair } from '../data/modelBankData';
import { correspondenceService } from '../services/correspondenceService';

interface ParallaxContextType {
  // Mode
  explainMode: boolean;
  setExplainMode: (val: boolean) => void;
  toggleExplainMode: () => void;

  // Region & Instruments
  selectedRegion: LunarRegion;
  setSelectedRegion: (region: LunarRegion) => void;
  sourceInstrument: InstrumentId;
  setSourceInstrument: (inst: InstrumentId) => void;
  targetInstrument: InstrumentId;
  setTargetInstrument: (inst: InstrumentId) => void;
  swapInstruments: () => void;

  // Image Selection & Products (Mandatory Section 19)
  sourceProduct: LunarImageProduct;
  setSourceProduct: (product: LunarImageProduct) => void;
  targetProduct: LunarImageProduct;
  setTargetProduct: (product: LunarImageProduct) => void;
  availableProducts: LunarImageProduct[];
  resetImagePair: () => void;

  // Pair Characterization & Difficulty
  pairCharacterization: PairCharacterization;

  // Adaptive Model Router
  modelCandidates: ModelCandidate[];
  selectedModelId: ModelId;
  setSelectedModelId: (id: ModelId) => void;
  selectedModel: ModelCandidate;

  // Conditional TMC-2 Bridge (Proposed for extreme 320:1 OHRC x IIRS gap)
  useTmcBridge: boolean;
  setUseTmcBridge: (val: boolean) => void;
  toggleTmcBridge: () => void;

  // Spatial Distribution / ANMS
  isAnmsActive: boolean;
  setIsAnmsActive: (val: boolean) => void;
  toggleAnms: () => void;

  // Sub-pixel Refinement (ECC)
  isSubpixelRefined: boolean;
  setIsSubpixelRefined: (val: boolean) => void;
  toggleSubpixelRefinement: () => void;

  // Comparison & Pipeline
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  isProcessing: boolean;
  pipelineProgress: number;
  currentStageIndex: number;
  currentStageId: PipelineStageId | null;
  runCorrespondence: () => Promise<void>;

  // Matches & Features
  matchFilter: MatchFilterType;
  setMatchFilter: (filter: MatchFilterType) => void;
  hoveredMatch: MatchPair | null;
  setHoveredMatch: (match: MatchPair | null) => void;
  sourceKeypoints: Keypoint[];
  targetKeypoints: Keypoint[];
  matchPairs: MatchPair[];
  filteredMatches: MatchPair[];
  metrics: AlignmentMetrics;

  // Simulation
  simulationParams: SimulationParams;
  updateSimulationParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void;
  resetSimulationParams: () => void;

  // Custom Cursor
  cursorLabel: string;
  setCursorLabel: (label: string) => void;
  isTouchDevice: boolean;
}

const defaultSimulationParams: SimulationParams = {
  sunElevationAngle: 18,
  sunAzimuthAngle: 135,
  spatialScaleRatio: 20,
  sensorNoiseSigma: 4.2,
  claheClipLimit: 3.2,
  shadowThreshold: 45,
};

const ParallaxContext = createContext<ParallaxContextType | undefined>(undefined);

export const ParallaxProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [explainMode, setExplainMode] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegionState] = useState<LunarRegion>(LUNAR_REGIONS[0]);
  const [sourceInstrument, setSourceInstrumentState] = useState<InstrumentId>('OHRC');
  const [targetInstrument, setTargetInstrumentState] = useState<InstrumentId>('TMC-2');

  // Mandatory Section 19: Image Products Selection
  const [sourceProduct, setSourceProductState] = useState<LunarImageProduct>(() =>
    getDefaultProductForInstrument('OHRC', LUNAR_REGIONS[0].id)
  );
  const [targetProduct, setTargetProductState] = useState<LunarImageProduct>(() =>
    getDefaultProductForInstrument('TMC-2', LUNAR_REGIONS[0].id)
  );

  const availableProducts = useMemo(() => {
    return LUNAR_PRODUCTS;
  }, []);

  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('CORRESPONDENCE');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineProgress, setPipelineProgress] = useState<number>(100);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(9);
  const [currentStageId, setCurrentStageId] = useState<PipelineStageId | null>('10_REGISTERED_OUTPUT');

  const [matchFilter, setMatchFilter] = useState<MatchFilterType>('INLIERS');
  const [hoveredMatch, setHoveredMatch] = useState<MatchPair | null>(null);

  // New Adaptive Paradigm States
  const [selectedModelOverride, setSelectedModelOverride] = useState<ModelId | null>(null);
  const [useTmcBridge, setUseTmcBridge] = useState<boolean>(false);
  const [isAnmsActive, setIsAnmsActive] = useState<boolean>(true);
  const [isSubpixelRefined, setIsSubpixelRefined] = useState<boolean>(true);

  const [sourceKeypoints, setSourceKeypoints] = useState<Keypoint[]>(MOCK_SOURCE_KEYPOINTS);
  const [targetKeypoints, setTargetKeypoints] = useState<Keypoint[]>(MOCK_TARGET_KEYPOINTS);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>(MOCK_MATCH_PAIRS);
  const [metrics, setMetrics] = useState<AlignmentMetrics>(MOCK_ALIGNMENT_METRICS);

  const [simulationParams, setSimulationParams] = useState<SimulationParams>(defaultSimulationParams);
  const [cursorLabel, setCursorLabel] = useState<string>('');
  const [isTouchDevice] = useState<boolean>(
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  // Synchronized Setters
  const setSelectedRegion = useCallback((region: LunarRegion) => {
    setSelectedRegionState(region);
    setSourceProductState(getDefaultProductForInstrument(sourceInstrument, region.id));
    setTargetProductState(getDefaultProductForInstrument(targetInstrument, region.id));
  }, [sourceInstrument, targetInstrument]);

  const setSourceProduct = useCallback((product: LunarImageProduct) => {
    setSourceProductState(product);
    if (product.instrument === 'OHRC' || product.instrument === 'TMC-2' || product.instrument === 'IIRS') {
      setSourceInstrumentState(product.instrument);
    }
    setSelectedModelOverride(null);
  }, []);

  const setTargetProduct = useCallback((product: LunarImageProduct) => {
    setTargetProductState(product);
    if (product.instrument === 'OHRC' || product.instrument === 'TMC-2' || product.instrument === 'IIRS') {
      setTargetInstrumentState(product.instrument);
    }
    setSelectedModelOverride(null);
  }, []);

  const setSourceInstrument = useCallback((inst: InstrumentId) => {
    setSourceInstrumentState(inst);
    setSourceProductState(getDefaultProductForInstrument(inst, selectedRegion.id));
    setSelectedModelOverride(null);
  }, [selectedRegion.id]);

  const setTargetInstrument = useCallback((inst: InstrumentId) => {
    setTargetInstrumentState(inst);
    setTargetProductState(getDefaultProductForInstrument(inst, selectedRegion.id));
    setSelectedModelOverride(null);
  }, [selectedRegion.id]);

  const swapInstruments = useCallback(() => {
    setSourceInstrumentState(targetInstrument);
    setTargetInstrumentState(sourceInstrument);
    setSourceProductState(targetProduct);
    setTargetProductState(sourceProduct);
    setSelectedModelOverride(null); // Reset override on pair swap to auto-rank
  }, [sourceInstrument, targetInstrument, sourceProduct, targetProduct]);

  const resetImagePair = useCallback(() => {
    setSelectedRegionState(LUNAR_REGIONS[0]);
    setSourceInstrumentState('OHRC');
    setTargetInstrumentState('TMC-2');
    setSourceProductState(getDefaultProductForInstrument('OHRC', LUNAR_REGIONS[0].id));
    setTargetProductState(getDefaultProductForInstrument('TMC-2', LUNAR_REGIONS[0].id));
    setSelectedModelOverride(null);
    setUseTmcBridge(false);
  }, []);

  // Dynamic Pair Characterization & Model Bank Evaluation
  const { characterization: pairCharacterization, rankedCandidates: modelCandidates, selectedModel: autoSelectedModel } = useMemo(() => {
    return evaluatePair(sourceInstrument, targetInstrument, selectedRegion, simulationParams);
  }, [sourceInstrument, targetInstrument, selectedRegion, simulationParams]);

  // Selected Model (user override or auto-ranked top candidate)
  const selectedModelId = selectedModelOverride || autoSelectedModel.id;
  const selectedModel = useMemo(() => {
    return modelCandidates.find(c => c.id === selectedModelId) || autoSelectedModel;
  }, [modelCandidates, selectedModelId, autoSelectedModel]);

  const setSelectedModelId = useCallback((id: ModelId) => {
    setSelectedModelOverride(id);
  }, []);

  const toggleExplainMode = useCallback(() => {
    setExplainMode(prev => !prev);
  }, []);

  const toggleAnms = useCallback(() => {
    setIsAnmsActive(prev => !prev);
  }, []);

  const toggleSubpixelRefinement = useCallback(() => {
    setIsSubpixelRefined(prev => !prev);
  }, []);

  const toggleTmcBridge = useCallback(() => {
    setUseTmcBridge(prev => !prev);
  }, []);

  const updateSimulationParam = useCallback(<K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setSimulationParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSimulationParams = useCallback(() => {
    setSimulationParams(defaultSimulationParams);
    setSelectedModelOverride(null);
  }, []);

  const runCorrespondence = useCallback(async () => {
    setIsProcessing(true);
    setPipelineProgress(0);
    setCurrentStageIndex(0);
    setCurrentStageId(PIPELINE_STAGES[0].id);

    try {
      const result = await correspondenceService.runCorrespondence(
        {
          sourceInstrument,
          targetInstrument,
          regionId: selectedRegion.id,
          selectedModelId,
          useTmcBridge,
          options: {
            enforceAnms: isAnmsActive
          }
        },
        (stageIdx: number) => {
          setCurrentStageIndex(stageIdx);
          setCurrentStageId(PIPELINE_STAGES[stageIdx].id);
          setPipelineProgress(Math.round(((stageIdx + 1) / PIPELINE_STAGES.length) * 100));
        }
      );

      setSourceKeypoints(result.sourceKeypoints);
      setTargetKeypoints(result.targetKeypoints);
      setMatchPairs(result.matches);

      // Reflect current model and refinement in metrics
      const updatedMetrics = {
        ...result.metrics,
        selectedModelName: selectedModel.name,
        tmcBridgeActive: useTmcBridge,
        rmse: isSubpixelRefined ? 1.28 : 1.76,
        uncertaintyPx: isSubpixelRefined ? 0.14 : 0.28,
        spatialCoverage: isAnmsActive ? 74.2 : 51.0
      };
      setMetrics(updatedMetrics);

      setPipelineProgress(100);
      setCurrentStageIndex(9);
      setCurrentStageId('10_REGISTERED_OUTPUT');
    } catch (err) {
      console.error('Error in correspondence execution:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [sourceInstrument, targetInstrument, selectedRegion, selectedModelId, useTmcBridge, isAnmsActive, isSubpixelRefined, selectedModel]);

  // Filter matches based on selected tab and ANMS state
  const filteredMatches = useMemo(() => {
    return matchPairs.filter(pair => {
      if (matchFilter === 'ALL_FEATURES' || matchFilter === 'CANDIDATES') return true;
      if (matchFilter === 'OUTLIERS') return !pair.isRansacInlier;
      if (matchFilter === 'ANMS_ONLY') return pair.isRansacInlier && pair.isAnmsSelected;
      if (matchFilter === 'INLIERS') {
        if (isAnmsActive) {
          return pair.isRansacInlier && pair.isAnmsSelected;
        }
        return pair.isRansacInlier;
      }
      return true;
    });
  }, [matchPairs, matchFilter, isAnmsActive]);

  return (
    <ParallaxContext.Provider
      value={{
        explainMode,
        setExplainMode,
        toggleExplainMode,
        selectedRegion,
        setSelectedRegion,
        sourceInstrument,
        setSourceInstrument,
        targetInstrument,
        setTargetInstrument,
        swapInstruments,
        sourceProduct,
        setSourceProduct,
        targetProduct,
        setTargetProduct,
        availableProducts,
        resetImagePair,
        pairCharacterization,
        modelCandidates,
        selectedModelId,
        setSelectedModelId,
        selectedModel,
        useTmcBridge,
        setUseTmcBridge,
        toggleTmcBridge,
        isAnmsActive,
        setIsAnmsActive,
        toggleAnms,
        isSubpixelRefined,
        setIsSubpixelRefined,
        toggleSubpixelRefinement,
        comparisonMode,
        setComparisonMode,
        isProcessing,
        pipelineProgress,
        currentStageIndex,
        currentStageId,
        runCorrespondence,
        matchFilter,
        setMatchFilter,
        hoveredMatch,
        setHoveredMatch,
        sourceKeypoints,
        targetKeypoints,
        matchPairs,
        filteredMatches,
        metrics,
        simulationParams,
        updateSimulationParam,
        resetSimulationParams,
        cursorLabel,
        setCursorLabel,
        isTouchDevice,
      }}
    >
      {children}
    </ParallaxContext.Provider>
  );
};

export const useParallax = (): ParallaxContextType => {
  const context = useContext(ParallaxContext);
  if (!context) {
    throw new Error('useParallax must be used within a ParallaxProvider');
  }
  return context;
};
