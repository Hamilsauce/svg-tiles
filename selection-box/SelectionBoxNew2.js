import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import { initUpdateStatsDisplay } from '../selection-box/stats-display.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { template, utils } = ham;

const SVG_NS = 'http://www.w3.org/2000/svg';

const validatePoint = ({ x, y }) => {
  return !isNaN(+x) && !isNaN(+y) ? true : false;
};

const validatePoints = (...points) => {
  return points.every(point => validatePoint(point));
};

const updateStats = initUpdateStatsDisplay(document.querySelector('#stats-display'));


export class TileSelector extends EventEmitter {
  #self;
  #selectionBox;
  #dragTargetHandle;
  #unitSize = 1;
  #wasInverted = false;
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
      // e.stopPropagation();
      // e.stopImmediatePropagation();
      // e.preventDefault();
    });
    
    this.#handles.end.addEventListener('click', (e) => {
      // e.stopPropagation();
      // e.preventDefault();
    });
    
    this.#self.addEventListener('pointerdown', this.dragStartHandler);
    
    window.selectionBox = this;
  }
  
  get isSelecting() { return Object.values(this.#handles).some((handle) => handle.dataset.isDragging === 'true'); };
  
  get parent() { return this.#self.parentElement; };
  
  get isRendered() { return !!this.parent; };
  
  get dom() { return this.#self; };
  
  get startPoint() { return this.isEndInverted ? this.#points.end : this.#points.start; };
  // get endPoint() { return this.isEndInverted ? this.#points.start : this.#points.end; };
  
  get startPoint() { return this.#points.start; };
  get endPoint() { return this.#points.end; };
  
  get boundingBox() { return this.#selectionBox.getBoundingClientRect(); };
  
  get x() { return Math.min(this.startPoint.x, this.endPoint.x); }
  get y() { return Math.min(this.startPoint.y, this.endPoint.y); }
  get width() { return Math.max(this.startPoint.x, this.endPoint.x) - this.x } //|| this.#unitSize; }
  get height() { return Math.max(this.startPoint.y, this.endPoint.y) - this.y } //|| this.#unitSize; }
  get isEndInverted() {
    const { start, end } = this.#points
    return end.x < start.x || end.y < start.y
    return this.endPoint.x < this.startPoint.x || this.endPoint.y < this.startPoint.y
  }
  
  get selectedDistance() {
    return this.getDistance(this.startPoint, this.endPoint);
  }
  
  domPoint(x, y, clamp = false, dir = 'floor') {
    if (typeof x === 'object') {
      x = x.x;
      y = x.y
    }
    const p = new DOMPoint(x, y).matrixTransform(
      this.ctx.getScreenCTM().inverse()
    );
    
    // return p
    
    return !clamp ? p : {
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
      handle.setAttribute('transform', 'translate(1,1)')
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
    this.#handles.end.setAttribute('transform', 'translate(2,2)')
    
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
    
    // console.table({ start: this.startPoint, end: this.endPoint })
    
    // this.#self.setAttribute('transform', `translate(${this.x},${this.y})`)
    this.#handles.end.setAttribute('transform', 'translate(1,1)')
    // this.#handles.end.setAttribute('cx', 1)
    // this.#handles.end.setAttribute('cy', 1)
    // this.#handles.start.setAttribute('transform', 'translate(2,2)')
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  remove() {
    if (this.isRendered) { this.#self.remove(); }
    
    return this;
  }
  
  setStartPoint(pt) {
    this.#points.start = { x: +pt.x, y: +pt.y };
    // Object.assign(this.startPoint, { x: +pt.x, y: +pt.y })
    // this.startPoint.x = pt.x
    // this.startPoint.y = pt.y
    
    return this;
  }
  
  setEndPoint(pt) {
    this.#points.end = { x: +pt.x, y: +pt.y };
    // Object.assign(this.endPoint, { x: +pt.x, y: +pt.y })
    // this.endPoint.x = pt.x
    // this.endPoint.y = pt.y
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
    
    // this.#self.setAttribute('transform', `translate(${this.x},${this.y})`)
    
    // this.#selectionBox.setAttribute('x', this.startPoint.x);
    // this.#selectionBox.setAttribute('y', this.startPoint.y);
    this.#selectionBox.setAttribute('width', this.width);
    this.#selectionBox.setAttribute('height', this.height);
    // this.#handles.end.setAttribute('cx', this.width);
    // this.#handles.end.setAttribute('cy', this.height);
    // this.#handles.start.setAttribute('cx', this.x);
    // this.#handles.start.setAttribute('cy', this.y);
    this.#selectionBox.setAttribute('transform', `translate(${this.startPoint.x},${this.startPoint.y})`)
    this.#handles.start.setAttribute('transform', `translate(${this.startPoint.x},${this.startPoint.y})`)
    this.#handles.end.setAttribute('transform', `translate(${this.endPoint.x},${this.endPoint.y})`)
    
    updateStats({
      start: { x: Math.round(this.startPoint.x), y: Math.round(this.startPoint.y) },
      end: { x: Math.round(this.endPoint.x), y: Math.round(this.endPoint.y) },
      xy: { x: Math.round(this.x), y: Math.round(this.y) },
      wh: { x: Math.round(this.width), y: Math.round(this.height) },
      wasInverted: this.#wasInverted,
      inverted: this.isEndInverted,
      handle: this.#dragTargetHandle?.dataset.handle,
    })
  }
  
  getDistance(from, to) {
    // if (!validatePoints(from, to)) {
    //   console.error('Invalid point in selector');
    //   return null;
    // }
    
    return Math.abs(Math.ceil((to.x - from.x) + (to.y - from.y) / 2));
  }
  
  onDragStart(e) {
    // e.stopPropagation();
    // e.preventDefault();
    
    const handle = e.target.closest('.selection-handle');
    this.#handles.end.setAttribute('transform', `translate(0,0)`)
    // console.warn('[ DRAG START ]: ', handle ? handle.dataset.handle : 'no handy')
    // console.warn('[ this.#dragTargetHandle before reassign ]: ', this.#dragTargetHandle ? this.#dragTargetHandle.dataset.handle : 'no handy')
    
    if (handle) {
      this.#dragTargetHandle = handle
      this.#self.dataset.isDragging = true;
      handle.dataset.isDragging = true;
      this.setDragTarget(handle)
      
    }
    
    this.#self.addEventListener('pointermove', this.dragHandler);
    
    this.parent.addEventListener('pointerup', this.dragEndHandler);
    
  }
  
  onDragHandle(e) {
    const pt = this.domPoint(e.clientX, e.clientY);
    
    
    // if (!this.#dragTargetHandle) return;
    
    
    
    // console.warn(this.#dragTargetHandle.dataset.handle)
    
    
    // if (pt.x < 0 || pt.y < 0) {
    //   console.warn('out of range', pt.x, pt.y)
    //   return
    // }
    
    const startToEnd = this.getDistance(this.startPoint, this.endPoint);
    // console.warn({
    //   isRendered: this.isRendered,
    //   isSelecting: this.isSelecting,
    //   startToEnd,
    // })
    console.warn('inverted, was', this.isEndInverted, this.#wasInverted)
    
    
    
    
    const handle = this.#dragTargetHandle;
    const handleLabel = handle.dataset.handle
    
    
    if (handleLabel === 'start') {
      this.setStartPoint(pt)
    }
    else if (handleLabel === 'end') {
      this.setEndPoint(pt);
    }
    
    if (this.isEndInverted === true && this.#wasInverted === false) {
      console.warn('inverted, not wasInverted', this.isEndInverted, this.#wasInverted)
      
      const label = this.#dragTargetHandle.dataset.handle;
      [this.#points.start, this.#points.end] = [this.#points.end, this.#points.start]
      this.setDragTarget(label === 'start' ? this.#handles.end : this.#handles.start)
      this.#wasInverted = true;
    }
    // else if (this.isEndInverted === false) {
    else if (this.isEndInverted === false && this.#wasInverted === true){
      
      //   console.warn('not inverted, wasInverted', this.isEndInverted, this.#wasInverted)
      
      const label = this.#dragTargetHandle.dataset.handle;
      this.#wasInverted = false;
      [this.#points.start, this.#points.end] = [this.#points.end, this.#points.start]
      
      
      this.setDragTarget(label === 'start' ? this.#handles.end : this.#handles.start);
      //   // console.warn('!inverted && wasInverted')
      
    }
    
    
    this.updateSelection();
    
    this.emitRange();
    
    const handleCoords = this.domPoint({
      x: +handle.getAttribute('cx'),
      y: +handle.getAttribute('cy'),
    });
    
    if (performance.now() % 1 === 0) {
      // console.table({
      //   handleCoords,
      //   start: this.startPoint,
      //   end: this.endPoint,
      //   xy: { x: this.x, y: this.y },
      //   widthHeight: { x: this.width, y: this.height },
      //   isEndInverted: this.isEndInverted,
      //   handleLabel,
      // })
      
    }
  }
  
  onDragEnd(e) {
    const handleEl = this.#dragTargetHandle
    // console.warn('[ DRAG END ]: ', handleEl ? handleEl.dataset.handle : 'no handy')
    const handleLabel = this.#dragTargetHandle.dataset.handle
    const pt = this.domPoint(e.clientX, e.clientY, true);
    
    // if (this.isEndInverted) {
    //   [this.#points.start, this.#points.end] = [this.#points.end, this.#points.start]
    // }
    // this.#wasInverted = false
    
    if (this.isEndInverted) {
      // const label = this.#dragTargetHandle.dataset.handle;
      // [this.#points.start, this.#points.end] = [this.#points.end, this.#points.start]
      this.#wasInverted = true
      // this.setDragTarget(handleLabel === 'start' ? this.#handles.start : this.#handles.end)
    }
    
    updateStats({
      start: { x: Math.round(this.startPoint.x), y: Math.round(this.startPoint.y) },
      end: { x: Math.round(this.endPoint.x), y: Math.round(this.endPoint.y) },
      xy: { x: Math.round(this.x), y: Math.round(this.y) },
      wh: { x: Math.round(this.width), y: Math.round(this.height) },
      wasInverted: this.#wasInverted,
      inverted: this.isEndInverted,
      handle: handleLabel,
    })
    
    // if (handleLabel === 'start' && !this.isEndInverted) {
    //   this.setStartPoint(pt)
    //   // this.setEndPoint(pt)
    
    // }
    // else if (handleLabel === 'end' && this.isEndInverted) {
    //   this.setEndPoint(pt)
    //   // this.setStartPoint(pt)
    // }
    
    
    // if (this.#dragTargetHandle.dataset.handle === 'start') {
    //   this.setStartPoint(pt)
    //   // this.#points.start = {
    //   //   x: this.x,
    //   //   y: this.y,
    //   // }
    //   //   this.#points.start = {
    //   //     x: this.x,
    //   //     y: this.y,
    //   //   }
    //   //   this.#points.end = {
    //   //     x: Math.max(this.startPoint.x, this.endPoint.x),
    //   //     y: Math.max(this.startPoint.y, this.endPoint.y),
    //   //   }
    // } else {
    //   this.setEndPoint(pt)
    //   // this.#points.end = {
    //   //   x: Math.max(this.startPoint.x, this.endPoint.x),
    //   //   y: Math.max(this.startPoint.y, this.endPoint.y),
    //   // }
    //   // this.#points.start = {
    //   //   x: Math.max(this.startPoint.x, this.endPoint.x),
    //   //   y: Math.max(this.startPoint.y, this.endPoint.y),
    //   // }
    
    //   // this.#points.end = {
    //   //   x: this.x,
    //   //   y: this.y,
    //   // }
    // }
    /*
     */
    // this.#points.start = {
    //   x: this.x,
    //   y: this.y,
    // }
    // this.#points.end = {
    //   x: Math.max(this.startPoint.x, this.endPoint.x),
    //   y: Math.max(this.startPoint.y, this.endPoint.y),
    // }
    
    // this.#points.end = {
    //   x: Math.max(this.startPoint.x, this.endPoint.x),
    //   y: Math.max(this.startPoint.y, this.endPoint.y),
    // }
    
    
    this.setDragTarget(null, e)
    
    this.#self.dataset.isDragging = false;
    this.updateSelection()
    
    // const pt = this.domPoint(e.clientX, e.clientY);
    
    // if (pt.x < 0 || pt.y < 0) {
    //   console.warn('out of range', pt.x, pt.y)
    //   return
    // }
    
    this.emitRange();
    this.#self.removeEventListener('pointermove', this.dragHandler);
    this.parent.removeEventListener('pointerup', this.dragEndHandler);
    
  }
  
  
  setDragTarget(handleEl, e) {
    // console.warn('[ set target ]: ', handleEl ? handleEl.dataset.handle : 'no handy')
    const curr = this.#dragTargetHandle;
    if (handleEl && handleEl === curr) {
      return;
    }
    
    if (handleEl) {
      if (curr) {
        this.#dragTargetHandle.dataset.isDragging = false;
        this.#dragTargetHandle = null;
      }
      
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