export type CorpusChunk = {
  id: string;
  documentId: string;
  path: string;
  title: string;
  kind: string;
  section: string;
  text: string;
  chunkIndex: number;
};

export type CorpusDocument = {
  id: string;
  path: string;
  title: string;
  kind: string;
  summary?: string;
  tags: string[];
  content: string;
  chunks: CorpusChunk[];
};

export type CorpusFile = {
  version: number;
  corpusHash: string;
  generatedAt: string;
  documents: CorpusDocument[];
  chunks: CorpusChunk[];
};

export type VectorsFile = {
  version: number;
  corpusHash: string;
  embeddingModel: string;
  vectors: { chunkId: string; embedding: number[] }[];
};

export type IndexedChunk = CorpusChunk & {
  embedding: number[];
};

export type RetrievalResult = {
  chunk: CorpusChunk;
  score: number;
};

export type AskAnkiActiveFile = {
  slug: string;
  path: string;
  title: string;
  kind?: string;
  summary?: string;
  elevatorPitch?: string;
  tags?: string[];
  technologies?: string[];
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  year?: string | number;
  status?: string;
  linksBlock?: string;
  content: string;
  type?: string;
};

export type AskAnkiRequest = {
  question: string;
  activeFile?: AskAnkiActiveFile;
};

export type AskAnkiSource = {
  path: string;
  title: string;
  score: number;
};

export type AskAnkiResponse = {
  answer: string;
  sources: AskAnkiSource[];
  refused: boolean;
};

export type AskAnkiCallbacks = {
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
};
