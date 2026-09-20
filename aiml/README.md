# CivicSeva AI/ML Subsystem

The AI layer is the autonomous cognitive engine of CivicSeva, executing multi-agent reasoning, multimodal classification, evidence analysis, RAG-grounded department mapping, and severity estimation.

## Architecture

```
                       [Citizen Input]
                (Text, Image, Audio, Location)
                              │
                              ▼
                      [Input Analyzer]
                              │
                              ▼
                    [Classification Agent]
                    (Multimodal Corroboration)
                              │
                              ▼
                       [Evidence Agent]
                   (Computer Vision Feature)
                              │
                              ▼
                       [Severity Agent]
                   (AI-estimated Severity)
                              │
                              ▼
                      [Department Agent]
                   (RAG Knowledge Grounding)
                              │
                              ▼
                    [Complaint Generator]
                 (Formal Grievance Synthesizer)
                              │
                              ▼
                  [Human-in-the-Loop Review]
```

## Modules

- `agents/`: Civic Agent (orchestrator), Classification Agent, Severity Agent, Department Agent, Followup Agent.
- `vision/`: Issue Detector with computer vision edge/entropy feature extraction & external vision API hooks.
- `nlp/`: Multimodal text classifier, entity extractor, structured complaint generator.
- `rag/`: In-memory civic municipal knowledge base and grounded semantic retriever.
- `workflows/`: Complaint workflow state engine with decision trace audit logging.
- `evaluation/`: Benchmark evaluation dataset (25 labeled cases) computing Accuracy, Precision, Recall, Macro-F1.

## Running Standalone

```bash
# Run standalone evaluation benchmark
python aiml/evaluation/metrics.py

# Run standalone FastAPI microservice (port 8001)
python aiml/server.py
```
