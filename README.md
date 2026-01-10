# RDF Graph Viewer

An experimental tool for connection-based learning through RDF knowledge graphs. This project enables interactive learning sessions where concepts are captured as semantic triples in Turtle format, building a persistent knowledge graph that grows across sessions. The graph uses standard ontologies (SKOS, FOAF, schema.org) to create rich, queryable representations of learning material with cross-linked concepts, multilingual labels, and temporal relationships.

Each interaction creates nodes in the graph with proper semantic relationships, allowing you to visualize how concepts connect, track learning across time, and explore knowledge through multiple dimensions. The system is designed for minimal interruption during learning - you provide brief inputs, and the assistant responds by writing structured RDF data to `index.ttl`, capturing both the concepts and the context of each learning interaction.

## Quick Example

When you ask "Why were there protests in Iran in 2022?", the system creates interconnected concepts:

```turtle
<concept:mahsa-amini-protests> a skos:Concept , schema:Event ;
    skos:prefLabel "2022 Iranian Protests"@en , "اعتراضات ایران ۱۴۰۱"@fa ;
    skos:related <concept:women-life-freedom> , <concept:morality-police> ;
    schema:startDate "2022-09-16"^^xsd:date .
```

These concepts link to broader hierarchies (human-rights-movements, womens-rights) and connect to other sessions' concepts, creating a web of knowledge that accumulates over time.

## Usage

**⚠️ Early Development Warning**: This project is in active development. APIs, file formats, and core functionality may change without notice. Expect breaking changes.

### Setup

1. Copy `.claude/commands/rdf-learning.md` to your Claude Code instance
2. Ensure `~/aleph-wiki/` directory exists for storing the knowledge graph
3. Invoke the skill with `/rdf-learning` or through the Skill tool

### Learning Flow

1. Start a learning session by invoking the `rdf-learning` skill
2. Ask questions or provide topics you want to explore
3. The assistant writes RDF triples to `~/aleph-wiki/index.ttl`
4. Monitor the file or use RDF visualization tools to explore your growing knowledge graph
5. Future sessions build on previous concepts, creating cross-session links

The graph structure allows filtering by session, time period, topic hierarchy, or semantic relationships - supporting both visual exploration and SPARQL queries for research.
