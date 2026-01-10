# Aleph.wiki Agent

This directory contains the Claude Code skill that acts as the RDF learning agent.

## Requirements

- **[Claude Code](https://claude.com/claude-code)** - Anthropic's official CLI for Claude

The agent runs as a skill within Claude Code and writes RDF triples to your knowledge graph.

## Installation

1. Copy `rdf-learning.md` to your Claude Code commands directory:
   ```bash
   cp agent/rdf-learning.md ~/.config/claude-code/skills/rdf-learning.md
   ```

   Or create a project-local command:
   ```bash
   mkdir -p .claude/commands
   cp agent/rdf-learning.md .claude/commands/rdf-learning.md
   ```

2. Ensure the `~/aleph-wiki/` directory exists:
   ```bash
   mkdir -p ~/aleph-wiki/ontologies
   ```

3. Invoke the skill in Claude Code:
   ```
   /rdf-learning
   ```

## What It Does

The RDF learning agent:

- Listens to your questions and learning inputs
- Identifies concepts and their relationships
- Downloads and references appropriate ontologies (SKOS, FOAF, schema.org)
- Writes semantic triples in Turtle format to `~/aleph-wiki/index.ttl`
- Creates cross-linked concepts that grow across sessions
- Tracks each session as a separate agent instance with timestamps
- Supports multilingual labels (English + original language + optional German)

## Example Interaction

```
You: Why were there protests in Iran in 2022?

Agent: [Writes to ~/aleph-wiki/index.ttl]
Added information about the 2022 Iranian protests to the graph. Created
concepts for the Mahsa Amini protests, the "Woman, Life, Freedom" slogan,
and morality police, cross-linking them with broader human rights movements.

New concepts: mahsa-amini-protests, women-life-freedom, morality-police
Related to: human-rights-movements, womens-rights, civil-disobedience
```

## File Structure

- `rdf-learning.md` - The Claude Code skill/command definition
- `README.md` - This file

## Future: Solid Integration

See [`../rdf-graph-viewer/SOLID_INTEGRATION.md`](../rdf-graph-viewer/SOLID_INTEGRATION.md) for plans to integrate with Solid Protocol, enabling the agent to write directly to your Solid Pod instead of local filesystem.
