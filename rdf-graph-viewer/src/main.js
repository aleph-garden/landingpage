import './style.css';
import * as d3 from 'd3';
import { Parser } from 'n3';

class RDFGraphViewer {
  constructor() {
    this.states = [];
    this.currentStateIndex = 0;
    this.lastRenderedIndex = -1;
    this.simulation = null;
    this.isLive = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.lastRdfContent = null;

    // Settings
    this.settings = {
      rdfFilePath: '/index.rdf',
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

    // Watch for file changes
    this.watchRDFFile();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  setupSettings() {
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsOverlay = document.getElementById('settings-overlay');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');

    // Settings controls
    this.rdfFilePathInput = document.getElementById('rdf-file-path');
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

    // RDF file path
    this.rdfFilePathInput.addEventListener('change', (e) => {
      this.settings.rdfFilePath = e.target.value;
      this.states = [];
      this.lastRdfContent = null;
      console.log('Changed RDF file path to:', this.settings.rdfFilePath);
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
    this.timeSlider = document.getElementById('time-slider');
    this.tickSlider = document.getElementById('tick-slider');
    this.currentTimeSpan = document.getElementById('current-time');
    this.currentTickSpan = document.getElementById('current-tick');
    this.totalStatesSpan = document.getElementById('total-states');
    this.liveBtn = document.getElementById('live-btn');
    this.timeProgress = document.getElementById('time-progress');
    this.tickProgress = document.getElementById('tick-progress');
    this.timeMarkers = document.getElementById('time-markers');
    this.tickMarkers = document.getElementById('tick-markers');
    this.timelineWrapper = document.getElementById('timeline-wrapper');

    // Time slider uses continuous time values
    this.timeSlider.addEventListener('input', (e) => {
      const timeValue = parseFloat(e.target.value);
      this.seekToTime(timeValue);
    });

    // Tick slider uses discrete state indices
    this.tickSlider.addEventListener('input', (e) => {
      const tickValue = parseInt(e.target.value);
      this.seekToTick(tickValue);
    });

    // Live button toggles live mode
    this.liveBtn.addEventListener('click', () => {
      if (!this.isLive) {
        this.goToLive();
      }
    });

    // Clicking on timeline disables live mode
    this.timelineWrapper.addEventListener('click', (e) => {
      if (this.isLive) {
        this.isLive = false;
        this.isPaused = true;
        this.updateLiveStatus();
      }
    });
  }

  seekToTime(timeValue) {
    // Find the state closest to this time
    if (this.states.length === 0) return;

    let closestIndex = 0;
    let minDiff = Math.abs(this.states[0].timestamp - timeValue);

    for (let i = 1; i < this.states.length; i++) {
      const diff = Math.abs(this.states[i].timestamp - timeValue);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    this.currentStateIndex = closestIndex;
    this.tickSlider.value = closestIndex;
    this.updateLiveStatus();
    this.renderState(this.currentStateIndex);
    this.updateTimelineInfo();
  }

  seekToTick(tickValue) {
    this.currentStateIndex = tickValue;
    if (this.states[tickValue]) {
      this.timeSlider.value = this.states[tickValue].timestamp;
    }
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
      const lastState = this.states[this.currentStateIndex];
      this.tickSlider.value = this.currentStateIndex;
      this.timeSlider.value = lastState.timestamp;
      this.renderState(this.currentStateIndex);
      this.updateTimelineInfo();
      this.updateLiveStatus();
    }
  }

  async watchRDFFile() {
    // In development, Vite's HMR will handle file watching
    // We'll set up a custom endpoint for this
    const checkInterval = 1000; // Check every second

    setInterval(async () => {
      try {
        let url;
        // If path starts with ~ or /, use the API endpoint
        if (this.settings.rdfFilePath.startsWith('~') || this.settings.rdfFilePath.startsWith('/') && this.settings.rdfFilePath.includes('/')) {
          url = `/api/file?path=${encodeURIComponent(this.settings.rdfFilePath)}&t=${Date.now()}`;
        } else {
          // Otherwise treat as relative path
          url = this.settings.rdfFilePath + '?t=' + Date.now();
        }

        const response = await fetch(url);
        if (response.ok) {
          const rdfContent = await response.text();

          // Only parse if content actually changed
          if (rdfContent !== this.lastRdfContent) {
            this.lastRdfContent = rdfContent;
            this.parseAndUpdateGraph(rdfContent);
          }
        }
      } catch (error) {
        console.log('Waiting for', this.settings.rdfFilePath, '...');
      }
    }, checkInterval);
  }

  parseAndUpdateGraph(rdfContent) {
    const parser = new Parser();
    const triples = [];

    try {
      parser.parse(rdfContent, (error, triple) => {
        if (error) {
          console.error('Parse error:', error);
          return;
        }
        if (triple) {
          triples.push(triple);
        } else {
          // Parsing complete
          this.addNewState(triples);
        }
      });
    } catch (error) {
      console.error('RDF parsing failed:', error);
    }
  }

  addNewState(triples) {
    const graphData = this.triplesToGraph(triples);

    // Add timestamp
    const timestamp = (Date.now() - this.startTime) / 1000; // seconds since start
    graphData.timestamp = timestamp;

    // Check if this state is different from the last one
    if (this.states.length > 0) {
      const lastState = this.states[this.states.length - 1];
      const lastData = { nodes: lastState.nodes, links: lastState.links };
      const currentData = { nodes: graphData.nodes, links: graphData.links };

      // Don't compare if we're in the middle of rebuilding (states cleared)
      if (this.states.length > 0 && JSON.stringify(lastData) === JSON.stringify(currentData)) {
        console.log('Skipping duplicate state');
        return; // No change, don't add duplicate state
      }
    }

    console.log('Adding new state with', graphData.nodes.length, 'nodes');
    this.states.push(graphData);

    // Update timeline ranges
    const maxTime = this.states[this.states.length - 1].timestamp;
    this.timeSlider.max = maxTime;
    this.tickSlider.max = this.states.length - 1;

    // Only auto-advance if we're in live mode (not paused)
    if (this.isLive && !this.isPaused) {
      this.currentStateIndex = this.states.length - 1;
      this.tickSlider.value = this.currentStateIndex;
      this.timeSlider.value = timestamp;
      this.renderState(this.currentStateIndex, true);
    }

    this.updateTimelineMarkers();
    this.updateTimelineInfo();
  }

  updateTimelineMarkers() {
    // Update tick markers
    this.tickMarkers.innerHTML = '';
    this.states.forEach((state, index) => {
      const marker = document.createElement('div');
      marker.className = 'timeline-marker';
      if (index % 5 === 0) marker.classList.add('major');
      marker.style.left = `${(index / (this.states.length - 1)) * 100}%`;
      this.tickMarkers.appendChild(marker);
    });

    // Update time markers - every 10 seconds
    this.timeMarkers.innerHTML = '';
    if (this.states.length > 0) {
      const maxTime = this.states[this.states.length - 1].timestamp;
      const interval = 10; // seconds
      for (let t = 0; t <= maxTime; t += interval) {
        const marker = document.createElement('div');
        marker.className = 'timeline-marker major';
        marker.style.left = `${(t / maxTime) * 100}%`;
        this.timeMarkers.appendChild(marker);
      }
    }
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

    this.lastRenderedIndex = index;
    const data = this.states[index];

    console.log('Rendering state', index, 'with', data.nodes.length, 'nodes:', data.nodes.map(n => n.id));

    // Update or create force simulation
    if (!this.simulation) {
      this.simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id).distance(this.settings.linkDistance))
        .force('charge', d3.forceManyBody().strength(this.settings.chargeStrength))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .force('collision', d3.forceCollide().radius(50));
    }

    // Update links
    const link = this.linkGroup
      .selectAll('.link')
      .data(data.links, d => `${d.source.id || d.source}-${d.target.id || d.target}-${d.predicate}`);

    link.exit()
      .transition()
      .duration(animate ? 500 : 0)
      .style('opacity', 0)
      .remove();

    const linkEnter = link.enter()
      .append('path')
      .attr('class', 'link')
      .style('opacity', 0);

    const linkMerge = linkEnter.merge(link);

    if (animate) {
      linkMerge.transition().duration(500).style('opacity', 1);
    } else {
      linkMerge.style('opacity', 1);
    }

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

    // Update nodes
    const node = this.nodeGroup
      .selectAll('.node')
      .data(data.nodes, d => d.id);

    node.exit()
      .transition()
      .duration(animate ? 500 : 0)
      .attr('r', 0)
      .style('opacity', 0)
      .remove();

    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    nodeEnter.append('circle')
      .attr('r', 0)
      .attr('fill', (d, i) => d3.schemeCategory10[i % 10]);

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

    if (animate) {
      nodeMerge.select('circle')
        .transition()
        .duration(500)
        .attr('r', this.settings.nodeSize);

      nodeMerge.select('text')
        .transition()
        .duration(500)
        .style('opacity', 1);
    } else {
      nodeMerge.select('circle').attr('r', this.settings.nodeSize);
      nodeMerge.select('text').style('opacity', 1);
    }

    // Apply type tags visibility
    nodeMerge.select('.type-tags')
      .style('display', this.settings.typeDisplay === 'on' ? 'block' : 'none');

    // Update simulation
    this.simulation
      .nodes(data.nodes)
      .on('tick', () => this.ticked(linkMerge, linkLabelMerge, nodeMerge));

    this.simulation.force('link').links(data.links);
    this.simulation.alpha(1).restart();
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
    // Format time as MM:SS
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (this.states.length > 0 && this.states[this.currentStateIndex]) {
      const currentTime = this.states[this.currentStateIndex].timestamp;
      this.currentTimeSpan.textContent = formatTime(currentTime);
      this.currentTickSpan.textContent = `Tick: ${this.currentStateIndex}`;
      this.totalStatesSpan.textContent = `States: ${this.states.length}`;

      // Update progress bars
      const maxTime = this.states[this.states.length - 1].timestamp;
      const timeProgress = (currentTime / maxTime) * 100;
      const tickProgress = ((this.currentStateIndex + 1) / this.states.length) * 100;

      this.timeProgress.style.width = `${timeProgress}%`;
      this.tickProgress.style.width = `${tickProgress}%`;
    } else {
      this.currentTimeSpan.textContent = '0:00';
      this.currentTickSpan.textContent = 'Tick: 0';
      this.totalStatesSpan.textContent = 'States: 0';
    }
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
