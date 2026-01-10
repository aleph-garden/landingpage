# aleph.wiki

An experimental tool for connection-based learning through RDF knowledge graphs. Aleph.wiki enables interactive learning sessions where concepts are captured as semantic triples in Turtle format, building a persistent knowledge graph that grows across sessions. The graph uses standard ontologies (SKOS, FOAF, schema.org) to create rich, queryable representations of learning material with cross-linked concepts, multilingual labels, and temporal relationships.

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

## Solid Protocol Integration

This project is designed to work with the **Solid Protocol** for decentralized, user-controlled data storage:

- **Agent**: Claude Code writes RDF triples directly to your Solid Pod via authenticated PATCH operations
- **Visualizer**: Web-based Solid app reads your knowledge graph and renders it with live updates
- **Ownership**: You control your data - knowledge graphs live in your Pod, not our servers
- **Collaboration**: Share concepts across Pods, create team workspaces, reference public ontologies

See [`rdf-graph-viewer/SOLID_INTEGRATION.md`](./rdf-graph-viewer/SOLID_INTEGRATION.md) for detailed architecture and implementation plan.

**Status:** Solid integration is planned but not yet implemented. Current version uses local filesystem storage.

## Requirements

- **[Claude Code](https://claude.com/claude-code)** - Required for the RDF learning agent

The agent runs as a skill within Claude Code and writes semantic triples to your knowledge graph.

## Repository Structure

- **`agent/`** - RDF learning agent (Claude Code skill)
- **`rdf-graph-viewer/`** - Graph visualization frontend (early development)
- **`aleph.wiki/`** - Future Solid app implementation
- **`.claude/`** - Claude Code configuration for this repository

## Usage

**⚠️ Early Development Warning**: This project is in active development. APIs, file formats, and core functionality may change without notice. Expect breaking changes.

### Setup

1. Install [Claude Code](https://claude.com/claude-code)

2. Copy the agent skill to your Claude Code instance:
   ```bash
   cp agent/rdf-learning.md ~/.config/claude-code/skills/rdf-learning.md
   ```

   Or use the project-local command (already configured):
   ```bash
   # Skill is already in .claude/commands/rdf-learning.md
   ```

3. Ensure `~/aleph-wiki/` directory exists for storing the knowledge graph:
   ```bash
   mkdir -p ~/aleph-wiki/ontologies
   ```

4. Invoke the skill in Claude Code:
   ```
   /rdf-learning
   ```

### Learning Flow

1. Start a learning session by invoking the `rdf-learning` skill
2. Ask questions or provide topics you want to explore
3. The assistant writes RDF triples to `~/aleph-wiki/index.ttl`
4. Monitor the file or use RDF visualization tools to explore your growing knowledge graph
5. Future sessions build on previous concepts, creating cross-session links

The graph structure allows filtering by session, time period, topic hierarchy, or semantic relationships - supporting both visual exploration and SPARQL queries for research.

## Roadmap

- [ ] Solid Protocol backend integration
- [ ] Web-based graph visualizer (Solid app)
- [ ] Real-time updates via WebSocket notifications
- [ ] Multi-user collaboration features
- [ ] SPARQL query interface
- [ ] Advanced graph layouts (hierarchical, temporal, semantic)
- [ ] Export/import functionality
