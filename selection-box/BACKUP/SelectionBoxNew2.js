import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { template, utils } = ham;

const SVG_NS = 'http://www.w3.org/2000/svg';

const validatePoint = ({ x, y }) => {
  return !isNaN(+x) && !isNaN(+y) ? true : false;
};

const validatePoints = (...points) => {
  return points.every(point => validatePoint(point));
};


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
    
    this.#self.addEventListener('pointerdown', this.dragStartHandler);
    
    window.selectionBox = this;
  }
  
  get isSelecting() { return Object.values(this.#handles).some((handle) => handle.dataset.isDragging === 'true'); };
  
  get parent() { return this.#self.parentElement; };
  
  get isRendered() { return !!this.parent; };
  
  get dom() { return this.#self; };
  
  get startPoint() { return this.#points.start; };
  
  get endPoint() { return this.#points.end; };
  
  get boundingBox() { return this.#selectionBox.getBoundingClientRect(); };
  
  get x() { return Math.min(this.startPoint.x, this.endPoint.x); }
  get y() { return Math.min(this.startPoint.y, this.endPoint.y); }
  get width() { return Math.max(this.startPoint.x, this.endPoint.x) || this.#unitSize; }
  get height() { return Math.max(this.startPoint.y, this.endPoint.y) || this.#unitSize; }
  
  
  get selectedDistance() {
    return this.getDistance(this.startPoint, this.endPoint);
  }
  
  domPoint(x, y, dir = 'floor') {
    if (typeof x === 'object') {
      x = x.x;
      y = x.y
    }
    const p = new DOMPoint(x, y).matrixTransform(
      this.ctx.getScreenCTM().inverse()
    );
    
    return p
    
    return {
      x: dir === 'floor' ? Math.floor(p.x) : Math.ceil(p.x),
      y: dir === 'floor' ? Math.floor(p.y) : Math.ceil(p.y)
    };
  }
  
  createSelectionHandle(handleLabel = 'start') {
    const handle = document.createElementNS(SVG_NS, 'circle');
    handle.classList.add('selection-handle');
    handle.dataset.handle = handleLabel;
    handle.id = `${handleLabel}-handle`;
    
    const startHandleBox = document.createElementNS(SVG_NS, 'rect');
    startHandleBox.classList.add('selection-handle-box');
    
    if (handleLabel === 'end') {
      handle.setAttribute('transform', 'translate(0,0)')
    }
    return handle;
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
    this.#self.setAttribute('transform', 'translate(0,0)')
  }
  
  render() {
    if (this.isRendered) { this.remove(); }
    
    this.ctx.append(this.#self);
    
    return this;
  }
  
  insertAt(tile) {
    this.render();
    
    const pt = {
      x: +tile.dataset.x,
      y: +tile.dataset.y,
    }
    
    this.setStartPoint({ x: pt.x, y: pt.y });
    
    this.setEndPoint({ x: pt.x, y: pt.y });
    
    console.table({
      start: this.startPoint,
      end: this.endPoint,
    })
    this.#handles.end.setAttribute('transform', 'translate(1,1)')
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  remove() {
    if (this.isRendered) { this.#self.remove(); }
    // this.resetPoints();
    
    return this;
  }
  
  setStartPoint(pt) {
    // if (!validatePoint(point)) return console.error('Invalid point in selector');
    
    this.#points.start = { x: +pt.x, y: +pt.y };
    
    return this;
  }
  
  setEndPoint(pt) {
    this.#points.end = { x: +pt.x, y: +pt.y };
    
    return this;
  }
  
  resetPoints() {
    this.setStartPoint({ x: null, y: null });
    this.setEndPoint({ x: null, y: null });
    
    return this;
  }
  
  updateSelection() {
    const adjustedEnd = {
      x: this.width - this.x,
      y: this.height - this.y
    }
    
    this.#self.setAttribute('transform', `translate(${this.x},${this.y})`)
    // this.#handles.end.setAttribute('transform', `translate(${adjustedEnd.x},${adjustedEnd.y})`)
    
    this.#selectionBox.setAttribute('width', this.width - this.x);
    this.#selectionBox.setAttribute('height', this.height - this.y);
    this.#handles.end.setAttribute('cx', this.width - this.x);
    this.#handles.end.setAttribute('cy', this.height - this.y);
  }
  
  getDistance(from, to) {
    // if (!validatePoints(from, to)) {
    //   console.error('Invalid point in selector');
    //   return null;
    // }
    
    return Math.abs(Math.ceil((to.x - from.x) + (to.y - from.y) / 2));
  }
  
  onDragStart(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const handle = e.target.closest('.selection-handle');
    this.#handles.end.setAttribute('transform', `translate(0,0)`)
    
    if (handle) {
      this.#dragTargetHandle = handle;
      this.#self.dataset.isDragging = true;
      handle.dataset.isDragging = true;
      this.setDragTarget(handle)
      
    }
    
    this.#self.addEventListener('pointermove', this.dragHandler);
    this.parent.addEventListener('pointerup', this.dragEndHandler);
  }
  
  onDragHandle(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const pt = this.domPoint(e.clientX, e.clientY);
    
    
    if (!this.#dragTargetHandle) return;
    
    const handle = this.#dragTargetHandle;
    
    
    console.warn(this.#dragTargetHandle.dataset.handle)
    console.table(pt)
    
    // if (!validatePoint(pt)) return;
    
    if (pt.x < 0 || pt.y < 0) {
      console.warn('out of range', pt.x, pt.y)
      return
    }
    
    const startToEnd = this.getDistance(this.startPoint, this.endPoint);
    // console.warn('startToEnd', startToEnd)
    
    console.table({
      start: this.startPoint,
      end: this.endPoint,
    })
    
    if (handle.dataset.handle === 'start') {
      if (
        (pt.x - this.endPoint.x) < 0 ||
        (pt.y - this.endPoint.y) < 0 // &&
        // this.getDistance(this.endPoint, pt) >= this.#unitSize
      ) {
        this.setStartPoint(pt)
      }
      else if ((pt.x - this.startPoint.x) > 0 || (pt.y - this.startPoint.y) > 0) {
        this.setStartPoint(pt)
        // this.setDragTarget(this.#handles.end)
        
      }
    }
    else if (handle.dataset.handle === 'end') {
      // if pt is greater than start
      // if ((pt.x - this.startPoint.x) > 0 || (pt.y - this.startPoint.y) > 0) {
      // }
      this.setEndPoint(pt);
      
      // if pt is less than start
      // else if ((pt.x - this.startPoint.x) < 0 || (pt.y - this.startPoint.y) < 0) {
      //   // this.setDragTarget(this.#handles.start)
      
      //   this.setEndPoint(pt);
      // }
    }
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  onDragEnd(e) {
    this.#self.removeEventListener('pointermove', this.dragHandler);
    this.parent.removeEventListener('pointerup', this.dragEndHandler);
    this.#self.dataset.isDragging = false;
    
    this.#dragTargetHandle.dataset.isDragging = false;
    
    this.#dragTargetHandle = null;
    
    const pt = this.domPoint(e.clientX, e.clientY);
    
    if (pt.x < 0 || pt.y < 0) {
      console.warn('out of range', pt.x, pt.y)
      return
    }
    
    this.emitRange();
  }
  
  
  setDragTarget(handleEl) {
    if (handleEl) {
      this.#dragTargetHandle = handleEl;
      handleEl.dataset.isDragging = true;
    } else {
      this.#dragTargetHandle.dataset.isDragging = false;
      this.#dragTargetHandle = null;
    }
  }
  
  
  resetDragTarget() {
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