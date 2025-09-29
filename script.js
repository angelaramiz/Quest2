// Estado inicial
let roadmap = JSON.parse(localStorage.getItem('customRoadmap')) || [];
let currentView = 'diagram';
let selectedNodeIndex = null;
let diagramOffset = { x: 0, y: 0 };
let isDraggingDiagram = false;
let dragStart = { x: 0, y: 0 };

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  renderDiagram();
  setupDiagramPanning();
});

// Configurar el arrastre del diagrama
function setupDiagramPanning() {
  const diagram = document.getElementById('diagramView');
  
  diagram.addEventListener('mousedown', (e) => {
    if (e.target === diagram) {
      isDraggingDiagram = true;
      dragStart.x = e.clientX - diagramOffset.x;
      dragStart.y = e.clientY - diagramOffset.y;
      diagram.style.cursor = 'grabbing';
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDraggingDiagram) return;
    
    diagramOffset.x = e.clientX - dragStart.x;
    diagramOffset.y = e.clientY - dragStart.y;
    
    const nodesGrid = document.getElementById('nodesGrid');
    nodesGrid.style.transform = `translate(${diagramOffset.x}px, ${diagramOffset.y}px)`;
    
    drawConnections();
  });
  
  document.addEventListener('mouseup', () => {
    isDraggingDiagram = false;
    diagram.style.cursor = 'grab';
  });
}

// Cambiar entre vistas
function switchView(view) {
  currentView = view;
  
  // Actualizar botones
  document.getElementById('btnDiagramView').classList.toggle('btn-active', view === 'diagram');
  document.getElementById('btnListView').classList.toggle('btn-active', view === 'list');
  
  // Mostrar/ocultar vistas
  document.getElementById('diagramView').style.display = view === 'diagram' ? 'block' : 'none';
  
  // Renderizar la vista correspondiente
  if (view === 'diagram') {
    renderDiagram();
  }
}

// Guardar en localStorage
function saveRoadmap() {
  localStorage.setItem('customRoadmap', JSON.stringify(roadmap));
  updateProgress();
}

// Renderizar el diagrama
function renderDiagram() {
  const container = document.getElementById('nodesGrid');
  const emptyDiagram = document.getElementById('emptyDiagram');
  
  if (!container || !emptyDiagram) return;
  
  if (roadmap.length === 0) {
    emptyDiagram.style.display = 'flex';
    container.innerHTML = '';
    return;
  }
  
  emptyDiagram.style.display = 'none';
  container.innerHTML = '';
  
  roadmap.forEach((node, index) => {
    const nodeEl = document.createElement('div');
    nodeEl.className = `node-circle ${node.type}`;
    nodeEl.dataset.nodeId = index;
    
    // Posición automática o usar posición guardada
    const position = node.position || calculateNodePosition(index, roadmap.length);
    nodeEl.style.left = `${position.x}px`;
    nodeEl.style.top = `${position.y}px`;
    
    // Texto del nodo (número o ícono para transiciones)
    let badgeText = `${index + 1}`;
    if (node.type === 'transition') {
      badgeText = '⇄';
    }
    
    nodeEl.innerHTML = `<span class="node-badge">${badgeText}</span>`;
    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNode(index);
      showNodeInfo(index);
    });
    
    // Hacer nodos arrastrables
    makeNodeDraggable(nodeEl, index);
    
    container.appendChild(nodeEl);
    
    // Añadir etiqueta para transiciones
    if (node.transitions && node.transitions.length > 0) {
      const label = document.createElement('div');
      label.className = 'transition-label';
      label.style.left = `${position.x + 40}px`;
      label.style.top = `${position.y - 10}px`;
      label.textContent = `${node.transitions.length} transiciones`;
      container.appendChild(label);
    }
  });
  
  drawConnections();
  updateProgress();
}

// Calcular posición automática para los nodos
function calculateNodePosition(index, total) {
  // Distribución en espiral para mejor visualización
  const angle = (index / total) * Math.PI * 2;
  const radius = 150 + (Math.min(index, total - index) * 40);
  const centerX = 500;
  const centerY = 300;
  
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  };
}

// Hacer nodos arrastrables
function makeNodeDraggable(nodeElement, nodeIndex) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  
  nodeElement.addEventListener('mousedown', startDrag);
  
  function startDrag(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(nodeElement.style.left);
    initialTop = parseInt(nodeElement.style.top);
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    e.stopPropagation();
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    nodeElement.style.left = `${initialLeft + dx}px`;
    nodeElement.style.top = `${initialTop + dy}px`;
    
    // Actualizar posición en datos
    roadmap[nodeIndex].position = {
      x: initialLeft + dx,
      y: initialTop + dy
    };
    
    drawConnections();
  }
  
  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    saveRoadmap();
  }
}

// Dibujar conexiones entre nodos
function drawConnections() {
  const svg = document.getElementById('connectionsCanvas');
  const transitionSvg = document.getElementById('transitionConnectionsCanvas');
  svg.innerHTML = '';
  transitionSvg.innerHTML = '';
  
  // Dibujar líneas entre nodos en orden
  for (let i = 0; i < roadmap.length - 1; i++) {
    const currentEl = document.querySelector(`[data-node-id="${i}"]`);
    const nextEl = document.querySelector(`[data-node-id="${i + 1}"]`);
    
    if (currentEl && nextEl) {
      const rect1 = currentEl.getBoundingClientRect();
      const rect2 = nextEl.getBoundingClientRect();
      const containerRect = svg.getBoundingClientRect();
      
      const x1 = rect1.left + rect1.width/2 - containerRect.left;
      const y1 = rect1.top + rect1.height/2 - containerRect.top;
      const x2 = rect2.left + rect2.width/2 - containerRect.left;
      const y2 = rect2.top + rect2.height/2 - containerRect.top;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', '#3498db');
      line.setAttribute('stroke-width', '3');
      
      svg.appendChild(line);
    }
  }
  
  // Dibujar conexiones de transición
  roadmap.forEach((node, index) => {
    if (node.transitions && node.transitions.length > 0) {
      const currentEl = document.querySelector(`[data-node-id="${index}"]`);
      
      node.transitions.forEach(transition => {
        const targetEl = document.querySelector(`[data-node-id="${transition.target}"]`);
        
        if (currentEl && targetEl) {
          const rect1 = currentEl.getBoundingClientRect();
          const rect2 = targetEl.getBoundingClientRect();
          const containerRect = transitionSvg.getBoundingClientRect();
          
          const x1 = rect1.left + rect1.width/2 - containerRect.left;
          const y1 = rect1.top + rect1.height/2 - containerRect.top;
          const x2 = rect2.left + rect2.width/2 - containerRect.left;
          const y2 = rect2.top + rect2.height/2 - containerRect.top;
          
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);
          line.setAttribute('stroke', '#1abc9c');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('stroke-dasharray', '5,5');
          
          transitionSvg.appendChild(line);
        }
      });
    }
  });
}

// Seleccionar un nodo
function selectNode(nodeIndex) {
  // Deseleccionar nodo anterior
  if (selectedNodeIndex !== null) {
    const prevNode = document.querySelector(`[data-node-id="${selectedNodeIndex}"]`);
    if (prevNode) prevNode.classList.remove('selected');
  }
  
  // Seleccionar nuevo nodo
  selectedNodeIndex = nodeIndex;
  const currentNode = document.querySelector(`[data-node-id="${nodeIndex}"]`);
  if (currentNode) currentNode.classList.add('selected');
}

// Mostrar información del nodo en el panel
function showNodeInfo(nodeIndex) {
  const panel = document.getElementById('infoPanel');
  const content = document.getElementById('panelContent');
  
  // Cargar información del nodo en el panel
  const node = roadmap[nodeIndex];
  
  let transitionsHTML = '';
  if (node.transitions && node.transitions.length > 0) {
    transitionsHTML = `
      <div class="transitions-list">
        <h4>Puntos de Transición:</h4>
        ${node.transitions.map(transition => `
          <div class="transition-item">
            <div class="transition-text">
              <strong>${transition.targetTitle}</strong>
              <br><small>${transition.type}</small>
            </div>
            <button onclick="removeTransition(${nodeIndex}, '${transition.target}')">🗑️</button>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  content.innerHTML = `
    <input type="text" class="node-title-input" value="${node.title}" 
           onblur="updateNodeTitle(${nodeIndex}, this.value)" placeholder="Título del nodo">
    <textarea class="node-comment-input" placeholder="Agregar comentario (opcional)" 
              onblur="updateNodeComment(${nodeIndex}, this.value)">${node.comment || ''}</textarea>
    
    <div class="topics-list">
      ${node.topics.map((topic, tIndex) => `
        <div class="topic-item">
          <input type="checkbox" class="topic-checkbox" ${topic.completed ? 'checked' : ''}
                 onchange="toggleTopicCompletion(${nodeIndex}, ${tIndex})">
          <input type="text" class="topic-input" value="${topic.text}"
                 onblur="updateTopicText(${nodeIndex}, ${tIndex}, this.value)">
          <div class="topic-actions">
            <button onclick="moveTopicUp(${nodeIndex}, ${tIndex})">⬆️</button>
            <button onclick="moveTopicDown(${nodeIndex}, ${tIndex})">⬇️</button>
            <button onclick="removeTopic(${nodeIndex}, ${tIndex})">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
    
    ${transitionsHTML}
    
    <button class="add-topic-btn" onclick="addTopic(${nodeIndex})">+ Añadir tema</button>
    
    <div class="panel-actions">
      <button onclick="addTransition(${nodeIndex})">+ Añadir Transición</button>
      <button onclick="moveNodeUp(${nodeIndex})">⬆️ Subir</button>
      <button onclick="moveNodeDown(${nodeIndex})">⬇️ Bajar</button>
      <button onclick="removeNode(${nodeIndex})">🗑️ Eliminar</button>
    </div>
  `;
  
  document.getElementById('panelTitle').textContent = `Nodo ${nodeIndex + 1}: ${node.title}`;
  panel.classList.add('open');
}

// Cerrar panel de información
function closeInfoPanel() {
  document.getElementById('infoPanel').classList.remove('open');
  saveRoadmap();
  
  // Actualizar la vista actual
  if (currentView === 'diagram') {
    renderDiagram();
  }
}

// Actualizar progreso
function updateProgress() {
  let totalTopics = 0;
  let completedTopics = 0;
  
  roadmap.forEach(node => {
    totalTopics += node.topics.length;
    completedTopics += node.topics.filter(topic => topic.completed).length;
  });
  
  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  
  document.getElementById('progressFill').style.width = `${percentage}%`;
  document.getElementById('completedCount').textContent = `${completedTopics} completados`;
  document.getElementById('totalCount').textContent = `${totalTopics} total`;
  document.getElementById('progressPercentage').textContent = `${percentage}%`;
}

// Añadir nodo
function addNode(type) {
  const defaultTitles = {
    start: 'Inicio: Mi Objetivo',
    intermediate: 'Paso Intermedio',
    end: '¡Logrado!',
    transition: 'Punto de Transición'
  };
  
  roadmap.push({
    type: type,
    title: defaultTitles[type],
    comment: '',
    topics: [],
    transitions: []
  });
  
  saveRoadmap();
  renderDiagram();
}

// Añadir nodo de transición
function addTransitionNode() {
  roadmap.push({
    type: 'transition',
    title: 'Punto de Transición',
    comment: 'Este nodo conecta con otras rutas de aprendizaje',
    topics: [],
    transitions: []
  });
  
  saveRoadmap();
  renderDiagram();
}

// Añadir tema
function addTopic(nodeIndex) {
  roadmap[nodeIndex].topics.push({
    text: 'Nuevo tema',
    completed: false
  });
  saveRoadmap();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
}

// Eliminar tema
function removeTopic(nodeIndex, topicIndex) {
  roadmap[nodeIndex].topics.splice(topicIndex, 1);
  saveRoadmap();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
}

// Mover tema hacia arriba
function moveTopicUp(nodeIndex, topicIndex) {
  if (topicIndex === 0) return;
  const topics = roadmap[nodeIndex].topics;
  [topics[topicIndex], topics[topicIndex - 1]] = [topics[topicIndex - 1], topics[topicIndex]];
  saveRoadmap();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
}

// Mover tema hacia abajo
function moveTopicDown(nodeIndex, topicIndex) {
  const topics = roadmap[nodeIndex].topics;
  if (topicIndex === topics.length - 1) return;
  [topics[topicIndex], topics[topicIndex + 1]] = [topics[topicIndex + 1], topics[topicIndex]];
  saveRoadmap();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
}

// Actualizar título del nodo
function updateNodeTitle(nodeIndex, title) {
  roadmap[nodeIndex].title = title;
  saveRoadmap();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    document.getElementById('panelTitle').textContent = `Nodo ${nodeIndex + 1}: ${title}`;
  }
}

// Actualizar comentario del nodo
function updateNodeComment(nodeIndex, comment) {
  roadmap[nodeIndex].comment = comment;
  saveRoadmap();
}

// Actualizar texto del tema
function updateTopicText(nodeIndex, topicIndex, text) {
  roadmap[nodeIndex].topics[topicIndex].text = text;
  saveRoadmap();
}

// Alternar completado del tema
function toggleTopicCompletion(nodeIndex, topicIndex) {
  roadmap[nodeIndex].topics[topicIndex].completed = 
    !roadmap[nodeIndex].topics[topicIndex].completed;
  saveRoadmap();
  updateProgress();
}

// Añadir transición
function addTransition(nodeIndex) {
  const targetIndex = prompt('¿A qué nodo quieres conectar? (ingresa el número del nodo):');
  if (targetIndex && !isNaN(targetIndex)) {
    const target = parseInt(targetIndex) - 1;
    if (target >= 0 && target < roadmap.length && target !== nodeIndex) {
      const type = prompt('Tipo de transición (ej: "Bases para Ciencia de Datos"):');
      if (type) {
        if (!roadmap[nodeIndex].transitions) {
          roadmap[nodeIndex].transitions = [];
        }
        
        roadmap[nodeIndex].transitions.push({
          target: target,
          targetTitle: roadmap[target].title,
          type: type
        });
        
        saveRoadmap();
        
        // Actualizar panel si está abierto
        if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
          showNodeInfo(nodeIndex);
        }
        
        renderDiagram();
      }
    } else {
      alert('Número de nodo inválido');
    }
  }
}

// Eliminar transición
function removeTransition(nodeIndex, targetIndex) {
  roadmap[nodeIndex].transitions = roadmap[nodeIndex].transitions.filter(t => t.target != targetIndex);
  saveRoadmap();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
  
  renderDiagram();
}

// Eliminar nodo
function removeNode(nodeIndex) {
  if (confirm('¿Estás seguro de que quieres eliminar este nodo?')) {
    roadmap.splice(nodeIndex, 1);
    
    // Cerrar panel si estaba abierto para este nodo
    if (selectedNodeIndex === nodeIndex) {
      closeInfoPanel();
      selectedNodeIndex = null;
    }
    
    saveRoadmap();
    renderDiagram();
  }
}

// Mover nodo hacia arriba
function moveNodeUp(nodeIndex) {
  if (nodeIndex === 0) return;
  [roadmap[nodeIndex], roadmap[nodeIndex - 1]] = 
    [roadmap[nodeIndex - 1], roadmap[nodeIndex]];
  saveRoadmap();
  renderDiagram();
}

// Mover nodo hacia abajo
function moveNodeDown(nodeIndex) {
  if (nodeIndex === roadmap.length - 1) return;
  [roadmap[nodeIndex], roadmap[nodeIndex + 1]] = 
    [roadmap[nodeIndex + 1], roadmap[nodeIndex]];
  saveRoadmap();
  renderDiagram();
}

// Mostrar modal de importación
function showImportModal() {
  document.getElementById('importModal').style.display = 'flex';
}

// Cerrar modal de importación
function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
}

// Importar roadmap desde texto
function importRoadmap() {
  const text = document.getElementById('importTextarea').value;
  if (!text.trim()) {
    alert('Por favor, ingresa un texto válido');
    return;
  }

  const lines = text.split('\n');
  const newRoadmap = [];
  let currentNode = null;
  let currentComment = '';

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return;

    // Nodo de inicio
    if (trimmedLine.startsWith('+ ') && !trimmedLine.toLowerCase().includes('dominio') && !trimmedLine.toLowerCase().includes('senior')) {
      if (currentNode) {
        if (currentComment) {
          currentNode.comment = currentComment;
          currentComment = '';
        }
        newRoadmap.push(currentNode);
      }
      currentNode = {
        type: 'start',
        title: trimmedLine.substring(2).trim(),
        comment: '',
        topics: [],
        transitions: []
      };
    }
    // Nodo final
    else if (trimmedLine.startsWith('+ ') && (trimmedLine.toLowerCase().includes('dominio') || trimmedLine.toLowerCase().includes('senior'))) {
      if (currentNode) {
        if (currentComment) {
          currentNode.comment = currentComment;
          currentComment = '';
        }
        newRoadmap.push(currentNode);
      }
      currentNode = {
        type: 'end',
        title: trimmedLine.substring(2).trim(),
        comment: '',
        topics: [],
        transitions: []
      };
    }
    // Nodo intermedio
    else if (trimmedLine.startsWith('- ') && !trimmedLine.startsWith('--')) {
      if (currentNode) {
        if (currentComment) {
          currentNode.comment = currentComment;
          currentComment = '';
        }
        newRoadmap.push(currentNode);
      }
      currentNode = {
        type: 'intermediate',
        title: trimmedLine.substring(2).trim(),
        comment: '',
        topics: [],
        transitions: []
      };
    }
    // Tema
    else if (trimmedLine.startsWith('-- ')) {
      if (currentNode) {
        currentNode.topics.push({
          text: trimmedLine.substring(3).trim(),
          completed: false
        });
      }
    }
    // Comentario
    else if (trimmedLine.startsWith('# ')) {
      if (currentNode) {
        currentNode.comment = trimmedLine.substring(2).trim();
      }
    }
    // Transición
    else if (trimmedLine.startsWith('! > ')) {
      if (currentNode) {
        const transitionMatch = trimmedLine.match(/! >\s*([^#]+)#\s*(.+)/);
        if (transitionMatch) {
          const targetName = transitionMatch[1].trim();
          const transitionType = transitionMatch[2].trim();
          
          if (!currentNode.transitions) {
            currentNode.transitions = [];
          }
          
          // Buscar el nodo objetivo por nombre
          const targetIndex = newRoadmap.findIndex(node => 
            node.title.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(node.title.toLowerCase())
          );
          
          if (targetIndex !== -1) {
            currentNode.transitions.push({
              target: targetIndex,
              targetTitle: newRoadmap[targetIndex].title,
              type: transitionType
            });
          } else {
            // Si no se encuentra, guardar la información para procesar después
            currentNode.transitions.push({
              targetName: targetName,
              type: transitionType
            });
          }
        }
      }
    }
  });

  // Añadir el último nodo
  if (currentNode) {
    if (currentComment) {
      currentNode.comment = currentComment;
    }
    newRoadmap.push(currentNode);
  }

  // Procesar transiciones pendientes
  newRoadmap.forEach(node => {
    if (node.transitions) {
      node.transitions.forEach(transition => {
        if (transition.targetName) {
          const targetIndex = newRoadmap.findIndex(n => 
            n.title.toLowerCase().includes(transition.targetName.toLowerCase()) ||
            transition.targetName.toLowerCase().includes(n.title.toLowerCase())
          );
          if (targetIndex !== -1) {
            transition.target = targetIndex;
            transition.targetTitle = newRoadmap[targetIndex].title;
            delete transition.targetName;
          }
        }
      });
    }
  });

  roadmap = newRoadmap;
  saveRoadmap();
  renderDiagram();
  closeImportModal();
  alert(`Ruta importada correctamente. Se crearon ${newRoadmap.length} nodos.`);
}

// Exportar roadmap a texto
function exportRoadmap() {
  let exportText = '';
  
  roadmap.forEach(node => {
    // Añadir nodo según tipo
    if (node.type === 'start') {
      exportText += `+ ${node.title}\n`;
    } else if (node.type === 'end') {
      exportText += `+ ${node.title}\n`;
    } else if (node.type === 'transition') {
      exportText += `- ${node.title} (Transición)\n`;
    } else {
      exportText += `- ${node.title}\n`;
    }
    
    // Añadir comentario si existe
    if (node.comment) {
      exportText += `# ${node.comment}\n`;
    }
    
    // Añadir temas
    node.topics.forEach(topic => {
      exportText += `-- ${topic.text}\n`;
    });
    
    // Añadir transiciones
    if (node.transitions && node.transitions.length > 0) {
      node.transitions.forEach(transition => {
        const targetNode = roadmap[transition.target];
        if (targetNode) {
          exportText += `! > ${targetNode.title} # ${transition.type}\n`;
        }
      });
    }
    
    exportText += '\n';
  });
  
  // Crear elemento temporal para copiar al portapapeles
  const textarea = document.createElement('textarea');
  textarea.value = exportText;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  alert('Ruta copiada al portapapeles. Puedes pegarla para importarla después o compartirla con un LLM para continuar.');
}

// Validar roadmap
function validateRoadmap() {
  const errors = [];
  
  // Verificar que hay al menos un nodo de inicio y uno de final
  const startNodes = roadmap.filter(node => node.type === 'start');
  const endNodes = roadmap.filter(node => node.type === 'end');
  
  if (startNodes.length === 0) {
    errors.push('No hay ningún nodo de inicio');
  }
  
  if (endNodes.length === 0) {
    errors.push('No hay ningún nodo final');
  }
  
  // Verificar que todos los nodos tienen título
  roadmap.forEach((node, index) => {
    if (!node.title.trim()) {
      errors.push(`El nodo ${index + 1} no tiene título`);
    }
  });
  
  // Mostrar resultados
  if (errors.length === 0) {
    alert('✅ La ruta es válida');
  } else {
    alert('❌ Se encontraron problemas:\n\n' + errors.join('\n'));
  }
}