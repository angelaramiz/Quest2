// Estado inicial
let roadmap;
try {
  roadmap = JSON.parse(localStorage.getItem('customRoadmap')) || [];
} catch (e) {
  console.warn('Error al cargar datos del localStorage:', e);
  roadmap = [];
}

let selectedNodeIndex = null;
let diagramOffset = { x: 0, y: 0 };
let isDraggingDiagram = false;
let dragStart = { x: 0, y: 0 };

// Función para escapar caracteres HTML peligrosos
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  renderDiagram();
  setupDiagramInteractions();
});

// Configurar interacciones del diagrama (touch y mouse)
function setupDiagramInteractions() {
  const diagram = document.getElementById('diagramView');
  
  // Soporte para mouse
  diagram.addEventListener('mousedown', startPan);
  document.addEventListener('mousemove', doPan);
  document.addEventListener('mouseup', endPan);
  
  // Soporte para touch (móvil)
  diagram.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', endPan);
  
  function startPan(e) {
    if (e.target === diagram) {
      isDraggingDiagram = true;
      dragStart.x = e.clientX - diagramOffset.x;
      dragStart.y = e.clientY - diagramOffset.y;
    }
  }
  
  function handleTouchStart(e) {
    if (e.target === diagram && e.touches.length === 1) {
      e.preventDefault();
      isDraggingDiagram = true;
      const touch = e.touches[0];
      dragStart.x = touch.clientX - diagramOffset.x;
      dragStart.y = touch.clientY - diagramOffset.y;
    }
  }
  
  function doPan(e) {
    if (!isDraggingDiagram) return;
    
    diagramOffset.x = e.clientX - dragStart.x;
    diagramOffset.y = e.clientY - dragStart.y;
    
    updateDiagramPosition();
  }
  
  function handleTouchMove(e) {
    if (!isDraggingDiagram || e.touches.length !== 1) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    diagramOffset.x = touch.clientX - dragStart.x;
    diagramOffset.y = touch.clientY - dragStart.y;
    
    updateDiagramPosition();
  }
  
  function updateDiagramPosition() {
    const nodesGrid = document.getElementById('nodesGrid');
    nodesGrid.style.transform = `translate(${diagramOffset.x}px, ${diagramOffset.y}px)`;
    drawConnections();
  }
  
  function endPan() {
    isDraggingDiagram = false;
  }
}

// Guardar en localStorage
function saveRoadmap() {
  try {
    localStorage.setItem('customRoadmap', JSON.stringify(roadmap));
    updateProgress();
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
    alert('Error al guardar los datos. Es posible que el navegador esté en modo privado o el almacenamiento esté lleno.');
  }
}

// Renderizar el diagrama
function renderDiagram() {
  const container = document.getElementById('nodesGrid');
  const emptyDiagram = document.getElementById('emptyDiagram');
  
  if (!container || !emptyDiagram) {
    console.error('Elementos DOM no encontrados');
    return;
  }
  
  // Limpiar contenido previo
  container.innerHTML = '';
  
  if (roadmap.length === 0) {
    emptyDiagram.style.display = 'flex';
    // Limpiar SVGs también
    const connectionsCanvas = document.getElementById('connectionsCanvas');
    const transitionCanvas = document.getElementById('transitionConnectionsCanvas');
    if (connectionsCanvas) connectionsCanvas.innerHTML = '';
    if (transitionCanvas) transitionCanvas.innerHTML = '';
    updateProgress();
    return;
  }
  
  emptyDiagram.style.display = 'none';
  
  roadmap.forEach((node, index) => {
    const nodeEl = document.createElement('div');
    nodeEl.className = `node-circle ${node.type}`;
    nodeEl.dataset.nodeId = index;
    
    // Posición automática o usar posición guardada
    const position = node.position || calculateNodePosition(index, roadmap.length);
    nodeEl.style.left = `${position.x}px`;
    nodeEl.style.top = `${position.y}px`;
    
    // Mantener selección si es el nodo seleccionado
    if (selectedNodeIndex === index) {
      nodeEl.classList.add('selected');
    }
    
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
  
  // Usar setTimeout para asegurar que los elementos estén renderizados antes de dibujar conexiones
  setTimeout(() => {
    drawConnections();
    updateProgress();
  }, 10);
}

// Calcular posición automática para los nodos (optimizado para móvil)
function calculateNodePosition(index, total) {
  // Valores por defecto para evitar NaN
  if (typeof index !== 'number' || typeof total !== 'number' || total <= 0) {
    return { x: 250, y: 150 };
  }
  
  // Obtener dimensiones del contenedor
  const container = document.getElementById('diagramView');
  const containerWidth = container ? container.clientWidth : window.innerWidth;
  const containerHeight = container ? container.clientHeight : window.innerHeight;
  
  // Valores mínimos para evitar problemas
  const minWidth = 300;
  const minHeight = 200;
  const safeWidth = Math.max(containerWidth || minWidth, minWidth);
  const safeHeight = Math.max(containerHeight || minHeight, minHeight);
  
  // Ajustar para móvil vs desktop
  const isMobile = safeWidth < 768;
  const centerX = safeWidth / 2;
  const centerY = safeHeight / 2;
  
  if (total <= 1) {
    return { x: centerX - 30, y: centerY - 30 };
  }
  
  if (isMobile) {
    // Layout más compacto para móvil
    const angle = (index / total) * Math.PI * 2;
    const radius = Math.min(safeWidth, safeHeight) * 0.25 + (index % 3) * 40;
    
    return {
      x: Math.max(0, centerX + Math.cos(angle) * radius - 30),
      y: Math.max(0, centerY + Math.sin(angle) * radius - 30)
    };
  } else {
    // Layout más espaciado para desktop
    const angle = (index / total) * Math.PI * 2;
    const radius = 150 + (Math.min(index, total - index) * 40);
    
    return {
      x: Math.max(0, centerX + Math.cos(angle) * radius - 35),
      y: Math.max(0, centerY + Math.sin(angle) * radius - 35)
    };
  }
}

// Hacer nodos arrastrables (compatible con touch)
function makeNodeDraggable(nodeElement, nodeIndex) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  
  // Eventos de mouse
  nodeElement.addEventListener('mousedown', startDrag);
  
  // Eventos de touch
  nodeElement.addEventListener('touchstart', startTouchDrag, { passive: false });
  
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
  
  function startTouchDrag(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    
    isDragging = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    initialLeft = parseInt(nodeElement.style.left);
    initialTop = parseInt(nodeElement.style.top);
    
    document.addEventListener('touchmove', touchDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
    e.stopPropagation();
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    updateNodePosition(dx, dy);
  }
  
  function touchDrag(e) {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    
    updateNodePosition(dx, dy);
  }
  
  function updateNodePosition(dx, dy) {
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
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', touchDrag);
    document.removeEventListener('touchend', stopDrag);
    saveRoadmap();
  }
}

// Dibujar conexiones entre nodos
function drawConnections() {
  const svg = document.getElementById('connectionsCanvas');
  const transitionSvg = document.getElementById('transitionConnectionsCanvas');
  svg.innerHTML = '';
  transitionSvg.innerHTML = '';
  
  // Crear gradientes para las líneas
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'connectionGradient');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '0%');
  
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#667eea');
  stop1.setAttribute('stop-opacity', '0.8');
  
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#764ba2');
  stop2.setAttribute('stop-opacity', '0.8');
  
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  
  // Gradiente para transiciones
  const transitionDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const transitionGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  transitionGradient.setAttribute('id', 'transitionGradient');
  transitionGradient.setAttribute('x1', '0%');
  transitionGradient.setAttribute('y1', '0%');
  transitionGradient.setAttribute('x2', '100%');
  transitionGradient.setAttribute('y2', '0%');
  
  const tStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  tStop1.setAttribute('offset', '0%');
  tStop1.setAttribute('stop-color', '#ff9a9e');
  tStop1.setAttribute('stop-opacity', '0.6');
  
  const tStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  tStop2.setAttribute('offset', '100%');
  tStop2.setAttribute('stop-color', '#fecfef');
  tStop2.setAttribute('stop-opacity', '0.6');
  
  transitionGradient.appendChild(tStop1);
  transitionGradient.appendChild(tStop2);
  transitionDefs.appendChild(transitionGradient);
  transitionSvg.appendChild(transitionDefs);
  
  // Dibujar líneas entre nodos en orden con curvas suaves
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
      
      // Crear línea curva con SVG path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      // Calcular puntos de control para curva suave
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const controlDistance = distance * 0.3;
      
      const angle = Math.atan2(dy, dx);
      const controlAngle1 = angle - Math.PI * 0.3;
      const controlAngle2 = angle + Math.PI * 0.3;
      
      const cx1 = x1 + Math.cos(controlAngle1) * controlDistance;
      const cy1 = y1 + Math.sin(controlAngle1) * controlDistance;
      const cx2 = x2 - Math.cos(controlAngle2) * controlDistance;
      const cy2 = y2 - Math.sin(controlAngle2) * controlDistance;
      
      const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', 'url(#connectionGradient)');
      path.setAttribute('stroke-width', '4');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
      
      svg.appendChild(path);
      
      // Añadir flecha al final
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const arrowAngle = Math.atan2(y2 - cy2, x2 - cx2);
      const arrowSize = 8;
      const arrowX = x2 - Math.cos(arrowAngle) * 45;
      const arrowY = y2 - Math.sin(arrowAngle) * 45;
      
      const arrowPoints = [
        [arrowX + Math.cos(arrowAngle) * arrowSize, arrowY + Math.sin(arrowAngle) * arrowSize],
        [arrowX + Math.cos(arrowAngle + Math.PI * 0.8) * arrowSize, arrowY + Math.sin(arrowAngle + Math.PI * 0.8) * arrowSize],
        [arrowX + Math.cos(arrowAngle - Math.PI * 0.8) * arrowSize, arrowY + Math.sin(arrowAngle - Math.PI * 0.8) * arrowSize]
      ].map(point => point.join(',')).join(' ');
      
      arrow.setAttribute('points', arrowPoints);
      arrow.setAttribute('fill', '#764ba2');
      arrow.setAttribute('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))');
      
      svg.appendChild(arrow);
    }
  }
  
  // Dibujar conexiones de transición con líneas punteadas animadas
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
          line.setAttribute('stroke', 'url(#transitionGradient)');
          line.setAttribute('stroke-width', '3');
          line.setAttribute('stroke-dasharray', '8,4');
          line.setAttribute('stroke-linecap', 'round');
          line.setAttribute('filter', 'drop-shadow(1px 1px 3px rgba(0,0,0,0.2))');
          
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
              <strong>${escapeHtml(transition.targetTitle)}</strong>
              <br><small>${escapeHtml(transition.type)}</small>
            </div>
            <button onclick="removeTransition(${nodeIndex}, '${transition.target}')">🗑️</button>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  content.innerHTML = `
    <input type="text" class="node-title-input" value="${escapeHtml(node.title)}" 
           onblur="updateNodeTitle(${nodeIndex}, this.value)" placeholder="Título del nodo">
    <textarea class="node-comment-input" placeholder="Agregar comentario (opcional)" 
              onblur="updateNodeComment(${nodeIndex}, this.value)">${escapeHtml(node.comment || '')}</textarea>
    
    <div class="topics-list">
      ${node.topics.map((topic, tIndex) => `
        <div class="topic-item">
          <input type="checkbox" class="topic-checkbox" ${topic.completed ? 'checked' : ''}
                 onchange="toggleTopicCompletion(${nodeIndex}, ${tIndex})">
          <input type="text" class="topic-input" value="${escapeHtml(topic.text)}"
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
  const panel = document.getElementById('infoPanel');
  panel.classList.remove('open');
  
  // Deseleccionar nodo actual
  if (selectedNodeIndex !== null) {
    const currentNode = document.querySelector(`[data-node-id="${selectedNodeIndex}"]`);
    if (currentNode) currentNode.classList.remove('selected');
    selectedNodeIndex = null;
  }
  
  saveRoadmap();
  
  // Forzar un renderizado completo
  renderDiagram();
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
  renderDiagram();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
}

// Eliminar tema
function removeTopic(nodeIndex, topicIndex) {
  roadmap[nodeIndex].topics.splice(topicIndex, 1);
  saveRoadmap();
  renderDiagram();
  
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
  renderDiagram();
  
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
  renderDiagram();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    showNodeInfo(nodeIndex);
  }
}

// Actualizar título del nodo
function updateNodeTitle(nodeIndex, title) {
  roadmap[nodeIndex].title = title;
  saveRoadmap();
  renderDiagram();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open') && selectedNodeIndex === nodeIndex) {
    document.getElementById('panelTitle').textContent = `Nodo ${nodeIndex + 1}: ${title}`;
  }
}

// Actualizar comentario del nodo
function updateNodeComment(nodeIndex, comment) {
  roadmap[nodeIndex].comment = comment;
  saveRoadmap();
  renderDiagram();
}

// Actualizar texto del tema
function updateTopicText(nodeIndex, topicIndex, text) {
  roadmap[nodeIndex].topics[topicIndex].text = text;
  saveRoadmap();
  renderDiagram();
}

// Alternar completado del tema
function toggleTopicCompletion(nodeIndex, topicIndex) {
  roadmap[nodeIndex].topics[topicIndex].completed = 
    !roadmap[nodeIndex].topics[topicIndex].completed;
  saveRoadmap();
  renderDiagram();
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
    
    // Actualizar referencias de transiciones
    roadmap.forEach(node => {
      if (node.transitions) {
        // Filtrar transiciones que apuntan al nodo eliminado
        node.transitions = node.transitions.filter(transition => transition.target !== nodeIndex);
        
        // Actualizar índices de transiciones que apuntan a nodos posteriores
        node.transitions.forEach(transition => {
          if (transition.target > nodeIndex) {
            transition.target--;
          }
        });
      }
    });
    
    // Cerrar panel si estaba abierto para este nodo
    if (selectedNodeIndex === nodeIndex) {
      closeInfoPanel();
      selectedNodeIndex = null;
    } else if (selectedNodeIndex > nodeIndex) {
      selectedNodeIndex--;
    }
    
    saveRoadmap();
    renderDiagram();
  }
}

// Mover nodo hacia arriba
function moveNodeUp(nodeIndex) {
  if (nodeIndex === 0) return;
  
  // Intercambiar nodos
  [roadmap[nodeIndex], roadmap[nodeIndex - 1]] = 
    [roadmap[nodeIndex - 1], roadmap[nodeIndex]];
  
  // Actualizar referencias de transiciones
  roadmap.forEach(node => {
    if (node.transitions) {
      node.transitions.forEach(transition => {
        if (transition.target === nodeIndex) {
          transition.target = nodeIndex - 1;
        } else if (transition.target === nodeIndex - 1) {
          transition.target = nodeIndex;
        }
      });
    }
  });
  
  // Actualizar selección si es necesario
  if (selectedNodeIndex === nodeIndex) {
    selectedNodeIndex = nodeIndex - 1;
  } else if (selectedNodeIndex === nodeIndex - 1) {
    selectedNodeIndex = nodeIndex;
  }
  
  saveRoadmap();
  renderDiagram();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open')) {
    showNodeInfo(selectedNodeIndex);
  }
}

// Mover nodo hacia abajo
function moveNodeDown(nodeIndex) {
  if (nodeIndex === roadmap.length - 1) return;
  
  // Intercambiar nodos
  [roadmap[nodeIndex], roadmap[nodeIndex + 1]] = 
    [roadmap[nodeIndex + 1], roadmap[nodeIndex]];
  
  // Actualizar referencias de transiciones
  roadmap.forEach(node => {
    if (node.transitions) {
      node.transitions.forEach(transition => {
        if (transition.target === nodeIndex) {
          transition.target = nodeIndex + 1;
        } else if (transition.target === nodeIndex + 1) {
          transition.target = nodeIndex;
        }
      });
    }
  });
  
  // Actualizar selección si es necesario
  if (selectedNodeIndex === nodeIndex) {
    selectedNodeIndex = nodeIndex + 1;
  } else if (selectedNodeIndex === nodeIndex + 1) {
    selectedNodeIndex = nodeIndex;
  }
  
  saveRoadmap();
  renderDiagram();
  
  // Actualizar panel si está abierto
  if (document.getElementById('infoPanel').classList.contains('open')) {
    showNodeInfo(selectedNodeIndex);
  }
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
  
  // Limpiar estado de selección
  selectedNodeIndex = null;
  
  // Cerrar panel si está abierto
  const panel = document.getElementById('infoPanel');
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
  }
  
  saveRoadmap();
  renderDiagram();
  closeImportModal();
  
  // Pequeña demora para asegurar que el renderizado se complete
  setTimeout(() => {
    updateProgress();
    alert(`Ruta importada correctamente. Se crearon ${newRoadmap.length} nodos.`);
  }, 100);
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
  
  // Verificar que roadmap existe y es un array
  if (!Array.isArray(roadmap)) {
    errors.push('Error: Los datos del roadmap están corruptos');
    alert('❌ Error crítico:\n\n' + errors.join('\n'));
    return;
  }
  
  // Verificar que hay al menos un nodo de inicio y uno de final
  const startNodes = roadmap.filter(node => node && node.type === 'start');
  const endNodes = roadmap.filter(node => node && node.type === 'end');
  
  if (startNodes.length === 0) {
    errors.push('No hay ningún nodo de inicio');
  }
  
  if (endNodes.length === 0) {
    errors.push('No hay ningún nodo final');
  }
  
  // Verificar que todos los nodos tienen título
  roadmap.forEach((node, index) => {
    if (!node) {
      errors.push(`El nodo ${index + 1} está vacío o corrupto`);
      return;
    }
    
    if (!node.title || typeof node.title !== 'string' || !node.title.trim()) {
      errors.push(`El nodo ${index + 1} no tiene título`);
    }
    
    // Verificar que las transiciones tienen targets válidos
    if (node.transitions && Array.isArray(node.transitions)) {
      node.transitions.forEach((transition, tIndex) => {
        if (transition.target < 0 || transition.target >= roadmap.length) {
          errors.push(`El nodo ${index + 1} tiene una transición inválida (${tIndex + 1})`);
        }
      });
    }
  });
  
  // Mostrar resultados
  if (errors.length === 0) {
    alert('✅ La ruta es válida');
  } else {
    alert('❌ Se encontraron problemas:\n\n' + errors.join('\n'));
  }
}