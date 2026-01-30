import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
import { initUpdateStatsDisplay } from '../selection-box/stats-display.js';

const { template, utils } = ham;

const SVG_NS = 'http://www.w3.org/2000/svg';

const validatePoint = ({ x, y }) => {
  return !isNaN(+x) && !isNaN(+y) ? true : false;
};

const validatePoints = (...points) => {
  return points.every(point => validatePoint(point));
};

const updateStats = initUpdateStatsDisplay(document.querySelector('#stats-display'));

console.warn({ ...['poo', 'butt', 'jasky'] })

export class TileSelector extends EventEmitter {
  #self;
  #selectionBox;
  #dragTargetHandle;
  #unitSize = 1;
  #points = {
    start: { x: null, y: null },
    end: { x: null, y: null },
  };
  
  #handles = {
    start: null,
    end: null,
  };
  
  constructor(ctx, options = {}) {
    if (!ctx || !(ctx instanceof SVGElement)) return;
    super();
    
    this.ctx = ctx;
    
    this.#unitSize = options.unitSize ? options.unitSize : this.#unitSize;
    
    this.#self = document.createElementNS(SVG_NS, 'g');
    this.#self.classList.add('tile-selector');
    this.#selectionBox = document.createElementNS(SVG_NS, 'rect');
    
    this.#handles = {
      start: this.createSelectionHandle('start'),
      end: this.createSelectionHandle('end'),
    };
    
    this.init();
    
    this.dragStartHandler = this.onDragStart.bind(this);
    this.dragHandler = this.onDragHandle.bind(this);
    this.dragEndHandler = this.onDragEnd.bind(this);
    
    this.#handles.start.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
    });
    
    this.#handles.end.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    
    this.#handles.start.addEventListener('pointerdown', this.dragStartHandler);
    this.#handles.end.addEventListener('pointerdown', this.dragStartHandler);
    
    window.selectionBox = this;
  }
  
  get isSelecting() { return Object.values(this.#handles).some((handle) => handle.dataset.isDragging === 'true'); };
  
  get parent() { return this.#self.parentElement; };
  
  get isRendered() { return !!this.parent; };
  
  get dom() { return this.#self; };
  
  get startPoint() { return this.#points.start; };
  
  get endPoint() { return this.#points.end; };
  
  get boundingBox() { return this.#selectionBox.getBoundingClientRect(); };
  
  get width() { return this.endPoint.x - this.startPoint.x || this.#unitSize; }
  
  get height() { return this.endPoint.y - this.startPoint.y || this.#unitSize; }
  
  get x() { return +this.#selectionBox.getAttribute('x'); }
  
  get y() { return +this.#selectionBox.getAttribute('y'); }
  
  get selectedDistance() {
    return this.getDistance(this.startPoint, this.endPoint);
  }
  
  domPoint(x, y, clamp = false, dir = 'floor') {
    const p = new DOMPoint(x, y).matrixTransform(
      this.ctx.getScreenCTM().inverse()
    );
    
    return !clamp ? p : {
      x: dir === 'floor' ? Math.floor(p.x) : Math.ceil(p.x),
      y: dir === 'floor' ? Math.floor(p.y) : Math.ceil(p.y)
    };
  }
  
  createSelectionHandle(handleLabel = 'start') {
    const startHandle = document.createElementNS(SVG_NS, 'circle');
    startHandle.classList.add('selection-handle');
    startHandle.dataset.handle = handleLabel;
    startHandle.id = `${handleLabel}-handle`;
    
    const startHandleBox = document.createElementNS(SVG_NS, 'rect');
    startHandleBox.classList.add('selection-handle-box');
    
    return startHandle;
  }
  
  init() {
    this.#selectionBox.setAttribute('stroke-width', 0.07);
    this.#selectionBox.setAttribute('stroke', 'green');
    this.#selectionBox.setAttribute('fill', 'none');
    
    this.#self.append(this.#selectionBox);
    
    this.#handles.start.setAttribute('r', 0.33);
    this.#handles.start.setAttribute('fill', 'white');
    this.#handles.start.setAttribute('stroke-width', 0.07);
    this.#handles.start.setAttribute('stroke', 'green');
    
    this.#handles.end.setAttribute('r', 0.33);
    this.#handles.end.setAttribute('fill', 'white');
    this.#handles.end.setAttribute('stroke-width', 0.07);
    this.#handles.end.setAttribute('stroke', 'green');
    
    this.#self.append(this.#handles.start, this.#handles.end);
  }
  
  render() {
    if (this.isRendered) { this.remove(); }
    
    this.ctx.append(this.#self);
    
    return this;
  }
  
  insertAt(tile) {
    this.render();
    
    this.setStartPoint({
      x: +tile.dataset.x,
      y: +tile.dataset.y,
    });
    this.setEndPoint({
      x: +tile.dataset.x,
      y: +tile.dataset.y,
    });
    
    this.#handles.end.setAttribute('transform', 'translate(1,1)');
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  remove() {
    if (this.isRendered) { this.#self.remove(); }
    
    this.resetPoints();
    
    return this;
  }
  
  setStartPoint({ x, y }) {
    if (!validatePoint({ x, y })) return console.error('Invalid point in selector');
    
    this.#points.start = {
      x: +x,
      y: +y,
    };
    
    // if (!this.endPoint || this.endPoint.x === null) {
    //   this.setEndPoint({ x: x + this.#unitSize, y: y + this.#unitSize });
    // }
    
    // this.emitRange()
    
    return this;
  }
  
  setEndPoint({ x, y }) {
    this.#points.end = {
      x: +x || null,
      y: +y || null,
    };
    
    return this;
  }
  
  resetPoints() {
    this.setStartPoint({ x: null, y: null });
    this.setEndPoint({ x: null, y: null });
    
    return this;
  }
  
  updateSelection() {
    this.#selectionBox.setAttribute('width', this.width);
    this.#selectionBox.setAttribute('height', this.height);
    this.#selectionBox.setAttribute('x', this.startPoint.x);
    this.#selectionBox.setAttribute('y', this.startPoint.y);
    
    this.#handles.start.setAttribute('cx', this.startPoint.x);
    this.#handles.start.setAttribute('cy', this.startPoint.y);
    
    this.#handles.end.setAttribute('cx', this.endPoint.x);
    this.#handles.end.setAttribute('cy', this.endPoint.y);
    
    updateStats({
      start: { x: Math.round(this.startPoint.x), y: Math.round(this.startPoint.y) },
      end: { x: Math.round(this.endPoint.x), y: Math.round(this.endPoint.y) },
      xy: { x: Math.round(this.x), y: Math.round(this.y) },
      wh: { x: Math.round(this.width), y: Math.round(this.height) },
      // wasInverted: this.#wasInverted,
      // inverted: this.isEndInverted,
      handle: this.#dragTargetHandle?.dataset.handle,
    })
  }
  
  getDistance(from, to) {
    if (!validatePoints(from, to)) {
      console.error('Invalid point in selector');
      return null;
    }
    
    return Math.abs(Math.ceil((to.x - from.x) + (to.y - from.y) / 2));
  }
  
  onDragStart(e) {
    e.stopPropagation();
    e.preventDefault();
    const handle = e.target.closest('.selection-handle');
    
    if (handle) {
      this.#dragTargetHandle = handle;
      handle.dataset.isDragging = true;
      this.parent.addEventListener('pointermove', this.dragHandler);
      this.parent.addEventListener('pointerup', this.dragEndHandler);
      this.#handles.end.setAttribute('transform', 'translate(0,0)');
      
    }
  }
  
  onDragHandle(e) {
    e.stopPropagation();
    
    if (!this.#dragTargetHandle) return;
    
    const handle = this.#dragTargetHandle;
    const handleLabel = this.#dragTargetHandle.dataset.handle;
    const clampDir = handleLabel === 'start' ? 'floor' : 'ceil';
    
    
    const pt = this.domPoint(e.clientX, e.clientY, handleLabel);
    const ptClamp = this.domPoint(e.clientX, e.clientY, true, clampDir);
    
    if (!validatePoint(pt)) return;
    
    if (pt.x < 0 || pt.y < 0) {
      console.warn('out of range', pt.x, pt.y)
      return
    }
    
    if (handle.dataset.handle === 'start') {
      if (
        (ptClamp.x - this.endPoint.x) < 0 &&
        (ptClamp.y - this.endPoint.y) < 0 &&
        this.getDistance(this.endPoint, ptClamp) >= this.#unitSize
      ) {
        this.setStartPoint(pt);
      }
      else if ((ptClamp.x - this.startPoint.x) >= 0 && (ptClamp.y - this.startPoint.y) >= 0) {
        // this.setDragTarget()
        this.setDragTarget(this.#handles.end)
        
        this.setEndPoint(pt);
      }
    }
    else if (handle.dataset.handle === 'end') {
      // if pt is greater than start
      if ((ptClamp.x - this.startPoint.x) >= 1 && (ptClamp.y - this.startPoint.y) >= 1) {
        this.setEndPoint(pt);
      }
      
      // if pt is less than start
      else if ((ptClamp.x - this.startPoint.x) < 0 && (ptClamp.y - this.startPoint.y) < 0) {
        // this.setDragTarget()
        this.setDragTarget(this.#handles.start)
        
        this.setStartPoint(pt);
      }
    }
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  onDragEnd(e) {
    this.parent.removeEventListener('pointermove', this.dragHandler);
    this.parent.removeEventListener('pointerup', this.dragEndHandler);
    const handle = this.#dragTargetHandle;
    
    this.#dragTargetHandle.dataset.isDragging = false;
    this.#dragTargetHandle = null;
    
    
    // if (pt.x < 0 || pt.y < 0) {
    //   console.warn('out of range', pt.x, pt.y)
    //   return
    // }
    
    if (handle.dataset.handle === 'start') {
      const pt = this.domPoint(e.clientX, e.clientY, true, 'floor');
      this.setStartPoint(pt)
    }
    else if (handle.dataset.handle === 'end') {
      const pt = this.domPoint(e.clientX, e.clientY, true, 'ceil');
      this.setEndPoint(pt)
    }
    this.updateSelection()
    
    
    this.emitRange();
  }
  
  
  setDragTarget(handleEl) {
    if (handleEl) {
      this.#dragTargetHandle = handleEl;
      handleEl.dataset.isDragging = true;
      
      this.parent.addEventListener('pointermove', this.dragHandler);
      this.parent.addEventListener('pointerup', this.dragEndHandler);
    }
    
    else {
      this.parent.removeEventListener('pointermove', this.dragHandler);
      this.parent.removeEventListener('pointerup', this.dragEndHandler);
      
      if (this.#dragTargetHandle) {
        this.#dragTargetHandle.dataset.isDragging = false;
        this.#dragTargetHandle = null;
      }
    }
  }
  
  resetDragTarget() {
    this.parent.removeEventListener('pointermove', this.dragHandler);
    this.parent.removeEventListener('pointerup', this.dragEndHandler);
    this.#dragTargetHandle.dataset.isDragging = false;
    this.#dragTargetHandle = null;
  }
  
  emitRange() {
    this.emit('selection', { start: this.startPoint, end: this.endPoint });
  }
}



let SelectorInstance = null;

export const getTileSelector = (ctx = document.querySelector('#scene')) => {
  if (SelectorInstance !== null) {
    return SelectorInstance;
  }
  
  SelectorInstance = new TileSelector(ctx);
  return SelectorInstance;
};