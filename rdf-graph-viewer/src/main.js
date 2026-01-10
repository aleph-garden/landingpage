import './style.css';
import * as d3 from 'd3';

class RDFGraphViewer {
  constructor() {
    this.sessions = []; // Array of {sessionUri, startTime, interactions: []}
    this.states = []; // Flattened array of states for rendering
    this.currentStateIndex = 0;
    this.lastRenderedIndex = -1;
    this.simulation = null;
    this.isLive = true;
    this.isPaused = false;
    this.lastRdfContent = null;

    // Settings
    this.settings = {
      sparqlEndpoint: 'http://localhost:3030/aleph-wiki/sparql',
      nodeSize: 20,
      linkDistance: 150,
      chargeStrength: -400,
      typeDisplay: 'on' // 'on' = tags, 'nodes' = show as nodes, 'off' = hide
    };

    this.svg = d3.select('#graph');
    this.width = window.innerWidth;
    this.height = window.innerHeight - 160;

    this.svg.attr('width', this.width).attr('height', this.height);

    // Create groups for links and nodes
    this.linkGroup = this.svg.append('g').attr('class', 'links');
    this.nodeGroup = this.svg.append('g').attr('class', 'nodes');
    this.linkLabelGroup = this.svg.append('g').attr('class', 'link-labels');

    // Setup timeline controls
    this.setupTimeline();

    // Setup settings panel
    this.setupSettings();

    // Load data from SPARQL endpoint
    this.loadFromSparql();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch(e.key) {
        case '/':
          e.preventDefault();
          // TODO: Implement search
          console.log('Search not yet implemented');
          break;
        case '?':
          // TODO: Implement help
          console.log('Help not yet implemented');
          break;
      }
    });
  }

  setupSettings() {
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsOverlay = document.getElementById('settings-overlay');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');

    // Settings controls
    this.sparqlEndpointInput = document.getElementById('sparql-endpoint');
    this.nodeSizeInput = document.getElementById('node-size');
    this.nodeSizeValue = document.getElementById('node-size-value');
    this.linkDistanceInput = document.getElementById('link-distance');
    this.linkDistanceValue = document.getElementById('link-distance-value');
    this.chargeStrengthInput = document.getElementById('charge-strength');
    this.chargeStrengthValue = document.getElementById('charge-strength-value');
    this.typeDisplayInputs = document.querySelectorAll('input[name="type-display"]');

    // Open settings
    this.settingsBtn.addEventListener('click', () => {
      this.settingsOverlay.classList.add('open');
    });

    // Close/toggle settings
    this.closeSettingsBtn.addEventListener('click', () => {
      this.settingsOverlay.classList.remove('open');
    });

    // SPARQL endpoint
    this.sparqlEndpointInput.addEventListener('change', (e) => {
      this.settings.sparqlEndpoint = e.target.value;
      this.states = [];
      this.sessions = [];
      console.log('Changed SPARQL endpoint to:', this.settings.sparqlEndpoint);
      this.loadFromSparql();
    });

    // Node size
    this.nodeSizeInput.addEventListener('input', (e) => {
      this.settings.nodeSize = parseInt(e.target.value);
      this.nodeSizeValue.textContent = this.settings.nodeSize;
      this.applySettings();
    });

    // Link distance
    this.linkDistanceInput.addEventListener('input', (e) => {
      this.settings.linkDistance = parseInt(e.target.value);
      this.linkDistanceValue.textContent = this.settings.linkDistance;
      this.applySettings();
    });

    // Charge strength
    this.chargeStrengthInput.addEventListener('input', (e) => {
      this.settings.chargeStrength = parseInt(e.target.value);
      this.chargeStrengthValue.textContent = this.settings.chargeStrength;
      this.applySettings();
    });

    // Type display mode
    this.typeDisplayInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.settings.typeDisplay = e.target.value;

          // Rebuild all states with new setting
          if (this.lastRdfContent) {
            this.states = []; // Clear existing states
            this.parseAndUpdateGraph(this.lastRdfContent);
          }
        }
      });
    });
  }

  applySettings() {
    if (this.simulation) {
      this.simulation.force('link').distance(this.settings.linkDistance);
      this.simulation.force('charge').strength(this.settings.chargeStrength);
      this.simulation.alpha(0.3).restart();
    }

    // Update node sizes
    this.nodeGroup.selectAll('.node circle')
      .attr('r', this.settings.nodeSize);

    // Update type tags visibility
    this.nodeGroup.selectAll('.type-tags')
      .style('display', this.settings.typeDisplay === 'on' ? 'block' : 'none');
  }

  setupTimeline() {
    this.sessionTimeline = document.getElementById('session-timeline');
    this.currentSessionSpan = document.getElementById('current-session');
    this.currentInteractionSpan = document.getElementById('current-interaction');
    this.liveBtn = document.getElementById('live-btn');

    // Live button toggles live mode
    this.liveBtn.addEventListener('click', () => {
      if (!this.isLive) {
        this.goToLive();
      }
    });
  }

  seekToState(stateIndex) {
    if (stateIndex < 0 || stateIndex >= this.states.length) return;

    this.currentStateIndex = stateIndex;
    this.isLive = false;
    this.isPaused = true;
    this.updateLiveStatus();
    this.renderState(this.currentStateIndex);
    this.updateTimelineInfo();
  }

  updateLiveStatus() {
    const isAtLatest = this.currentStateIndex === this.states.length - 1;
    this.isLive = isAtLatest && !this.isPaused;

    if (this.isLive) {
      this.liveBtn.classList.add('live');
      this.isPaused = false;
    } else {
      this.liveBtn.classList.remove('live');
      this.isPaused = true;
    }
  }

  goToLive() {
    if (this.states.length > 0) {
      this.isLive = true;
      this.isPaused = false;
      this.currentStateIndex = this.states.length - 1;
      this.renderState(this.currentStateIndex);
      this.updateTimelineInfo();
      this.updateLiveStatus();
      this.updateSessionTimeline();
    }
  }

  async loadFromSparql() {
    try {
      console.log('Loading from SPARQL endpoint:', this.settings.sparqlEndpoint);

      // Query for sessions and interactions
      const sessionsQuery = `
        PREFIX schema: <http://schema.org/>
        PREFIX session: <http://aleph-wiki.local/session/>
        PREFIX interaction: <http://aleph-wiki.local/interaction/>

        SELECT ?session ?sessionStart ?interaction ?interactionStart
        WHERE {
          ?session a ?sessionType ;
                   schema:startTime ?sessionStart .
          FILTER(CONTAINS(STR(?sessionType), "Session"))

          OPTIONAL {
            ?interaction schema:agent ?session ;
                        schema:startTime ?interactionStart .
            FILTER(CONTAINS(STR(?interactionType), "Interaction"))
            ?interaction a ?interactionType .
          }
        }
        ORDER BY ?sessionStart ?interactionStart
      `;

      const sessionsData = await this.executeSparqlQuery(sessionsQuery);
      await this.extractSessionsAndInteractions(sessionsData);

      // Query for all triples (content)
      const triplesQuery = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
          FILTER(!CONTAINS(STR(?s), "session:") && !CONTAINS(STR(?s), "interaction:") && !CONTAINS(STR(?s), "agent:"))
        }
      `;

      const triplesData = await this.executeSparqlQuery(triplesQuery);
      this.generateStatesFromTriples(triplesData);

    } catch (error) {
      console.error('Error loading from SPARQL:', error);
    }
  }

  async executeSparqlQuery(query) {
    const response = await fetch(this.settings.sparqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.bindings;
  }

  async extractSessionsAndInteractions(results) {
    const sessionMap = new Map();

    // Process SPARQL results
    results.forEach(row => {
      const sessionUri = row.session.value;
      const sessionStart = row.sessionStart.value;

      if (!sessionMap.has(sessionUri)) {
        sessionMap.set(sessionUri, {
          uri: sessionUri,
          startTime: sessionStart,
          interactions: []
        });
      }

      if (row.interaction) {
        const interactionUri = row.interaction.value;
        const interactionStart = row.interactionStart.value;

        sessionMap.get(sessionUri).interactions.push({
          uri: interactionUri,
          startTime: interactionStart,
          session: sessionUri
        });
      }
    });

    // Sort sessions by start time
    this.sessions = Array.from(sessionMap.values())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Sort interactions within each session and remove duplicates
    this.sessions.forEach(session => {
      const uniqueInteractions = new Map();
      session.interactions.forEach(int => {
        uniqueInteractions.set(int.uri, int);
      });
      session.interactions = Array.from(uniqueInteractions.values())
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    console.log('Extracted sessions:', this.sessions);
  }

  generateStatesFromTriples(sparqlTriples) {
    const newStates = [];

    // Convert SPARQL results to internal triple format
    const allContentTriples = sparqlTriples.map(row => ({
      subject: row.s.value,
      predicate: row.p.value,
      object: row.o.value,
      objectType: row.o.type
    }));

    console.log('Total content triples:', allContentTriples.length);

    const totalInteractions = this.sessions.reduce((sum, s) => sum + s.interactions.length, 0);
    if (totalInteractions === 0) {
      console.warn('No interactions found');
      return;
    }

    this.sessions.forEach((session, sessionIndex) => {
      session.interactions.forEach((interaction, interactionIndex) => {
        const portionSize = Math.floor(allContentTriples.length / totalInteractions);
        const startIndex = (sessionIndex * session.interactions.length + interactionIndex) * portionSize;
        const endIndex = Math.min(startIndex + portionSize, allContentTriples.length);

        const isLastInteraction = sessionIndex === this.sessions.length - 1 &&
                                  interactionIndex === session.interactions.length - 1;

        const triplesToShow = isLastInteraction ? allContentTriples : allContentTriples.slice(0, endIndex);
        const graphData = this.triplesToGraphFromSparql(triplesToShow);

        console.log(`State ${newStates.length}: ${triplesToShow.length} triples, ${graphData.nodes.length} nodes, ${graphData.links.length} links`);

        newStates.push({
          ...graphData,
          sessionIndex,
          interactionIndex,
          sessionUri: session.uri,
          interactionUri: interaction.uri,
          timestamp: interaction.startTime,
          tripleCount: triplesToShow.length
        });
      });
    });

    this.states = newStates;
    console.log('Generated', this.states.length, 'states from sessions');

    if (this.isLive && !this.isPaused) {
      this.currentStateIndex = this.states.length - 1;
      this.renderState(this.currentStateIndex, true);
    }

    this.updateSessionTimeline();
  }

  updateSessionTimeline() {
    this.sessionTimeline.innerHTML = '';

    if (this.sessions.length === 0) return;

    let stateIndex = 0;

    this.sessions.forEach((session, sessionIndex) => {
      // Create session container
      const sessionContainer = document.createElement('div');
      sessionContainer.className = 'session-container';

      session.interactions.forEach((interaction, interactionIndex) => {
        const currentStateIndex = stateIndex; // Capture the current value

        const interactionBtn = document.createElement('button');
        interactionBtn.className = 'interaction-btn';
        interactionBtn.textContent = `${interactionIndex + 1}`;
        interactionBtn.title = `Interaction ${interactionIndex + 1}`;
        interactionBtn.dataset.stateIndex = currentStateIndex; // Store in data attribute

        // Highlight current interaction
        if (currentStateIndex === this.currentStateIndex) {
          interactionBtn.classList.add('active');
        }

        // Click to navigate to this interaction
        interactionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetIndex = parseInt(e.currentTarget.dataset.stateIndex);
          console.log('Interaction button clicked, seeking to state', targetIndex);
          this.seekToState(targetIndex);
        });

        sessionContainer.appendChild(interactionBtn);
        stateIndex++;
      });

      this.sessionTimeline.appendChild(sessionContainer);

      // Add session separator (except after last session)
      if (sessionIndex < this.sessions.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'session-separator';
        separator.textContent = '...';

        // Calculate time difference
        const currentSessionTime = new Date(session.startTime);
        const nextSessionTime = new Date(this.sessions[sessionIndex + 1].startTime);
        const diffMs = nextSessionTime - currentSessionTime;

        const tooltip = document.createElement('div');
        tooltip.className = 'session-separator-tooltip';
        tooltip.textContent = this.formatTimeDifference(diffMs);
        separator.appendChild(tooltip);

        this.sessionTimeline.appendChild(separator);
      }
    });
  }

  formatTimeDifference(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  triplesToGraphFromSparql(triples) {
    const nodes = new Map();
    const links = [];
    const nodeTypes = new Map();

    console.log('Building graph from SPARQL triples:', triples.length);

    // First pass: identify rdf:type relationships
    triples.forEach(triple => {
      const subject = this.shortenURI(triple.subject);
      const predicate = this.shortenURI(triple.predicate);
      const object = this.shortenURI(triple.object);

      if (predicate === 'type') {
        if (!nodeTypes.has(subject)) {
          nodeTypes.set(subject, []);
        }
        nodeTypes.get(subject).push(object);
      }
    });

    // Second pass: build graph
    triples.forEach(triple => {
      const subject = this.shortenURI(triple.subject);
      const predicate = this.shortenURI(triple.predicate);
      const object = this.shortenURI(triple.object);
      const isObjectUri = triple.objectType === 'uri';

      if (predicate === 'type') {
        if (!nodes.has(subject)) {
          nodes.set(subject, {
            id: subject,
            label: subject,
            types: this.settings.typeDisplay === 'on' ? (nodeTypes.get(subject) || []) : []
          });
        }

        if (this.settings.typeDisplay === 'nodes') {
          if (!nodes.has(object)) {
            nodes.set(object, {
              id: object,
              label: object,
              types: [],
              isType: true
            });
          }
          links.push({
            source: subject,
            target: object,
            predicate: predicate
          });
        }
        return;
      }

      if (!nodes.has(subject)) {
        nodes.set(subject, {
          id: subject,
          label: subject,
          types: this.settings.typeDisplay === 'on' ? (nodeTypes.get(subject) || []) : []
        });
      }

      if (isObjectUri) {
        if (!nodes.has(object)) {
          nodes.set(object, {
            id: object,
            label: object,
            types: this.settings.typeDisplay === 'on' ? (nodeTypes.get(object) || []) : []
          });
        }

        links.push({
          source: subject,
          target: object,
          predicate: predicate
        });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links: links
    };
  }

  triplesToGraph(triples) {
    const nodes = new Map();
    const links = [];
    const nodeTypes = new Map(); // Track rdf:type relationships

    console.log('Building graph with typeDisplay mode:', this.settings.typeDisplay);

    // First pass: identify rdf:type relationships
    triples.forEach(triple => {
      const subject = this.shortenURI(triple.subject.value);
      const predicate = this.shortenURI(triple.predicate.value);
      const object = this.shortenURI(triple.object.value);

      if (predicate === 'type') {
        if (!nodeTypes.has(subject)) {
          nodeTypes.set(subject, []);
        }
        nodeTypes.get(subject).push(object);
      }
    });

    // Second pass: build graph
    triples.forEach(triple => {
      const subject = this.shortenURI(triple.subject.value);
      const predicate = this.shortenURI(triple.predicate.value);
      const object = this.shortenURI(triple.object.value);

      // Handle rdf:type based on display setting
      if (predicate === 'type') {
        // Always ensure subject node exists
        if (!nodes.has(subject)) {
          nodes.set(subject, {
            id: subject,
            label: subject,
            types: this.settings.typeDisplay === 'on' ? (nodeTypes.get(subject) || []) : []
          });
        }

        if (this.settings.typeDisplay === 'nodes') {
          // Show type as a node with edge
          if (!nodes.has(object)) {
            console.log('Adding type node:', object);
            nodes.set(object, {
              id: object,
              label: object,
              types: [],
              isType: true // Mark as a type node
            });
          }
          console.log('Adding type link:', subject, '->', object);
          links.push({
            source: subject,
            target: object,
            predicate: predicate
          });
        }
        return;
      }

      // Add subject node with its types (only for 'on' mode)
      if (!nodes.has(subject)) {
        nodes.set(subject, {
          id: subject,
          label: subject,
          types: this.settings.typeDisplay === 'on' ? (nodeTypes.get(subject) || []) : []
        });
      }

      // Add object node with its types (only if it's a URI, not a literal)
      if (triple.object.termType === 'NamedNode') {
        if (!nodes.has(object)) {
          nodes.set(object, {
            id: object,
            label: object,
            types: this.settings.typeDisplay === 'on' ? (nodeTypes.get(object) || []) : []
          });
        }

        // Add link
        links.push({
          source: subject,
          target: object,
          predicate: predicate
        });
      } else {
        // For literals, we might want to show them differently
        // For now, skip them from the graph
      }
    });

    const result = {
      nodes: Array.from(nodes.values()),
      links: links
    };

    console.log('Graph built:', result.nodes.length, 'nodes,', result.links.length, 'links');
    console.log('Nodes:', result.nodes.map(n => n.id));

    return result;
  }

  shortenURI(uri) {
    // Simple URI shortening - extract the last part
    const match = uri.match(/[#/]([^#/]+)$/);
    return match ? match[1] : uri;
  }

  renderState(index, animate = false) {
    if (index < 0 || index >= this.states.length) return;

    // Don't re-render if we're already showing this state
    if (index === this.lastRenderedIndex) {
      console.log('Skipping render - already showing state', index);
      return;
    }

    const previousData = this.lastRenderedIndex >= 0 ? this.states[this.lastRenderedIndex] : null;
    this.lastRenderedIndex = index;
    const data = this.states[index];

    console.log('Rendering state', index, 'with', data.nodes.length, 'nodes:', data.nodes.map(n => n.id));

    // Preserve existing node positions
    if (previousData && this.simulation) {
      const positionMap = new Map();
      this.simulation.nodes().forEach(node => {
        positionMap.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
      });

      // Apply saved positions to new data
      data.nodes.forEach(node => {
        const saved = positionMap.get(node.id);
        if (saved) {
          node.x = saved.x;
          node.y = saved.y;
          node.vx = 0;
          node.vy = 0;
          // Pin the node position to prevent gravity movement
          node.fx = saved.x;
          node.fy = saved.y;
        }
      });
    }

    // Update or create force simulation
    if (!this.simulation) {
      this.simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id).distance(this.settings.linkDistance))
        .force('charge', d3.forceManyBody().strength(this.settings.chargeStrength))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .force('collision', d3.forceCollide().radius(50))
        .alphaDecay(0.05); // Faster settling
    }

    // Identify new and removed links
    const previousLinkIds = previousData ? new Set(previousData.links.map(l => `${l.source.id || l.source}-${l.target.id || l.target}-${l.predicate}`)) : new Set();
    const currentLinkIds = new Set(data.links.map(l => `${l.source.id || l.source}-${l.target.id || l.target}-${l.predicate}`));

    // Update links
    const link = this.linkGroup
      .selectAll('.link')
      .data(data.links, d => `${d.source.id || d.source}-${d.target.id || d.target}-${d.predicate}`);

    link.exit()
      .classed('removed', true)
      .transition()
      .duration(500)
      .style('opacity', 0)
      .style('stroke', '#ff4444')
      .remove();

    const linkEnter = link.enter()
      .append('path')
      .attr('class', 'link')
      .classed('new', true)
      .style('opacity', 0)
      .style('stroke', '#44ff44');

    const linkMerge = linkEnter.merge(link);

    // Mark new links
    linkMerge.each(function(d) {
      const linkId = `${d.source.id || d.source}-${d.target.id || d.target}-${d.predicate}`;
      const isNew = !previousLinkIds.has(linkId);
      d3.select(this).classed('new', isNew);
    });

    linkMerge
      .transition()
      .duration(500)
      .style('opacity', 1)
      .style('stroke', d => {
        const linkId = `${d.source.id || d.source}-${d.target.id || d.target}-${d.predicate}`;
        return !previousLinkIds.has(linkId) ? '#44ff44' : '#666';
      })
      .transition()
      .delay(1500)
      .style('stroke', '#666');

    // Update link labels
    const linkLabel = this.linkLabelGroup
      .selectAll('.link-label')
      .data(data.links, d => `${d.source.id || d.source}-${d.target.id || d.target}-${d.predicate}`);

    linkLabel.exit().remove();

    const linkLabelEnter = linkLabel.enter()
      .append('text')
      .attr('class', 'link-label')
      .text(d => d.predicate)
      .style('opacity', 0);

    const linkLabelMerge = linkLabelEnter.merge(linkLabel);

    if (animate) {
      linkLabelMerge.transition().duration(500).style('opacity', 1);
    } else {
      linkLabelMerge.style('opacity', 1);
    }

    // Identify new and removed nodes
    const previousNodeIds = previousData ? new Set(previousData.nodes.map(n => n.id)) : new Set();
    const currentNodeIds = new Set(data.nodes.map(n => n.id));

    // Update nodes
    const node = this.nodeGroup
      .selectAll('.node')
      .data(data.nodes, d => d.id);

    node.exit()
      .classed('removed', true)
      .select('circle')
      .transition()
      .duration(500)
      .attr('r', this.settings.nodeSize * 1.5)
      .style('fill', '#ff4444')
      .style('opacity', 0)
      .end()
      .then(() => node.exit().remove());

    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node')
      .classed('new', true)
      .call(d3.drag()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    nodeEnter.append('circle')
      .attr('r', 0)
      .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
      .style('stroke', '#44ff44')
      .style('stroke-width', 3);

    // Add type tags
    const typeGroup = nodeEnter.append('g')
      .attr('class', 'type-tags')
      .attr('transform', 'translate(-20, -30)');

    // Add a tag for each type
    typeGroup.each(function(d) {
      if (d.types && d.types.length > 0) {
        d.types.forEach((type, i) => {
          const tag = d3.select(this).append('g')
            .attr('class', 'type-tag')
            .attr('transform', `translate(0, ${i * 18})`);

          tag.append('rect')
            .attr('width', type.length * 6 + 8)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', 'rgba(100, 108, 255, 0.8)')
            .attr('stroke', 'rgba(100, 108, 255, 1)')
            .attr('stroke-width', 1);

          tag.append('text')
            .attr('x', 4)
            .attr('y', 10)
            .attr('fill', '#fff')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .text(type);
        });
      }
    });

    nodeEnter.append('text')
      .attr('dy', 30)
      .text(d => d.label)
      .style('opacity', 0);

    const nodeMerge = nodeEnter.merge(node);

    // Mark new nodes and animate
    nodeMerge.each(function(d) {
      const isNew = !previousNodeIds.has(d.id);
      d3.select(this).classed('new', isNew);
    });

    nodeMerge.select('circle')
      .transition()
      .duration(500)
      .attr('r', this.settings.nodeSize)
      .style('stroke', d => !previousNodeIds.has(d.id) ? '#44ff44' : 'none')
      .style('stroke-width', d => !previousNodeIds.has(d.id) ? 3 : 0)
      .transition()
      .delay(1500)
      .style('stroke', 'none')
      .style('stroke-width', 0);

    nodeMerge.select('text')
      .transition()
      .duration(500)
      .style('opacity', 1);

    // Apply type tags visibility
    nodeMerge.select('.type-tags')
      .style('display', this.settings.typeDisplay === 'on' ? 'block' : 'none');

    // Update simulation
    this.simulation
      .nodes(data.nodes)
      .on('tick', () => this.ticked(linkMerge, linkLabelMerge, nodeMerge));

    this.simulation.force('link').links(data.links);

    // Only apply gentle force if there are new nodes
    const hasNewNodes = data.nodes.some(n => !previousNodeIds.has(n.id));
    if (hasNewNodes) {
      this.simulation.alpha(0.3).restart(); // Gentle restart for new nodes
    } else {
      this.simulation.alpha(0.1).restart(); // Very gentle for position adjustments only
    }
  }

  ticked(link, linkLabel, node) {
    link.attr('d', d => {
      const sourceX = d.source.x;
      const sourceY = d.source.y;
      const targetX = d.target.x;
      const targetY = d.target.y;

      // Create a curved path
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const dr = Math.sqrt(dx * dx + dy * dy);

      return `M${sourceX},${sourceY}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
    });

    linkLabel.attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  dragStarted(event, d) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragEnded(event, d) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  updateTimelineInfo() {
    if (this.states.length > 0 && this.states[this.currentStateIndex]) {
      const state = this.states[this.currentStateIndex];
      const sessionUri = this.shortenURI(state.sessionUri);
      const interactionUri = this.shortenURI(state.interactionUri);

      this.currentSessionSpan.textContent = `Session: ${sessionUri}`;
      this.currentInteractionSpan.textContent = `Interaction: ${interactionUri} (${state.interactionIndex + 1}/${this.sessions[state.sessionIndex].interactions.length})`;
    } else {
      this.currentSessionSpan.textContent = 'No session';
      this.currentInteractionSpan.textContent = 'No interaction';
    }

    // Update active state in timeline
    this.updateSessionTimeline();
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight - 160;
    this.svg.attr('width', this.width).attr('height', this.height);

    if (this.simulation) {
      this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(1).restart();
    }
  }
}

// Initialize the viewer
new RDFGraphViewer();
