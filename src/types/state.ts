import { InstrumentId } from './instruments';
import { LunarRegion } from './regions';
import { 
  PipelineStageId, 
  MatchFilterType, 
  ComparisonMode, 
  AlignmentMetrics, 
  MatchPair, 
  Keypoint 
} from './correspondence';

export interface SimulationParams {
  sunElevationAngle: number; // 5 to 80 deg
  sunAzimuthAngle: number; // 0 to 360 deg
  spatialScaleRatio: number; // 1 to 20x
  sensorNoiseSigma: number; // 0 to 25
  claheClipLimit: number; // 1.0 to 5.0
  shadowThreshold: number; // 0 to 100
}

export interface ParallaxAppState {
  explainMode: boolean; // false = Scientific Mode, true = Explain Mode
  selectedRegion: LunarRegion;
  sourceInstrument: InstrumentId;
  targetInstrument: InstrumentId;
  activeComparisonMode: ComparisonMode;
  isProcessing: boolean;
  activePipelineStage: PipelineStageId | null;
  pipelineProgress: number; // 0 to 100
  matchFilter: MatchFilterType;
  showCoordinates: boolean;
  activeMatchPair: MatchPair | null;
  sourceFeatures: Keypoint[];
  targetFeatures: Keypoint[];
  matchPairs: MatchPair[];
  metrics: AlignmentMetrics;
  simulationParams: SimulationParams;
  cursorLabel: string;
  isDemoDataMode: boolean;
}
