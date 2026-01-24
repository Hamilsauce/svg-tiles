import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { template, utils, download } = ham;

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
  #anchor = { x: null, y: null };
  #focus = { x: null, y: null };
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
    
    // this.#anchor = null;
    // this.#focus = null;
    
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
    // this.#handles.start.addEventListener('pointerdown', this.dragStartHandler);
    // this.#handles.end.addEventListener('pointerdown', this.dragStartHandler);
    
    window.selectionBox = this;
  }
  
  get isSelecting() { return Object.values(this.#handles).some((handle) => handle.dataset.isDragging === 'true'); };
  
  get parent() { return this.#self.parentElement; };
  
  get isRendered() { return !!this.parent; };
  
  get dom() { return this.#self; };
  
  // get startPoint() { return this.#points.start; };
  // get endPoint() { return this.#points.end; };
  get startPoint() { return this.#points.start; };
  get endPoint() { return this.#points.end; };
  
  get boundingBox() { return this.#selectionBox.getBoundingClientRect(); };
  
  // get height() { return this.endPoint.y - this.startPoint.y || this.#unitSize; }
  // get width() { return this.endPoint.x - this.startPoint.x || this.#unitSize; }
  // get height() { return this.endPoint.y - this.startPoint.y || this.#unitSize; }
  
  get x() { return Math.min(this.#anchor.x, this.#focus.x); }
  get y() { return Math.min(this.#anchor.y, this.#focus.y); }
  get width() { return Math.max(this.#anchor.x, this.#focus.x) || this.#unitSize; }
  get height() { return Math.max(this.#anchor.y, this.#focus.y) || this.#unitSize; }
 
  // get y() { return +this.startPoint.y; }
  // get x() { return +this.#selectionBox.getAttribute('x'); }
  // get y() { return +this.#selectionBox.getAttribute('y'); }
  
  get selectedDistance() {
    return this.getDistance(this.startPoint, this.endPoint);
  }
  
  domPoint(x, y, dir = 'floor') {
    const p = new DOMPoint(x, y).matrixTransform(
      this.ctx.getScreenCTM().inverse()
    );
    // return { x: p.x, y: p.y }
    return {
      x: dir === 'floor' ? Math.floor(p.x) : Math.ceil(p.x),
      y: dir === 'floor' ? Math.floor(p.y) : Math.ceil(p.y)
    };
  }
  
  createSelectionHandle(handleLabel = 'start', options) {
    const handle = document.createElementNS(SVG_NS, 'circle');
    handle.classList.add('selection-handle');
    handle.dataset.handle = handleLabel;
    handle.id = `${handleLabel}-handle`;
    
    const handleBox = document.createElementNS(SVG_NS, 'rect');
    handleBox.classList.add('selection-handle-box');
    handle.setAttribute('transform', 'translate(0,0)')
    
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
    // window.saveSVG = () => download('tile-selector2.svg', document.querySelector('#svg').outerHTML)
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
      x: +tile.dataset.x, // + this.#unitSize,
      y: +tile.dataset.y, // + this.#unitSize,
    });
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  remove() {
    if (this.isRendered) { this.#self.remove(); }
    
    this.resetPoints();
    
    return this;
  }
  
  setStartPoint(point) {
    if (!validatePoint(point)) return console.error('Invalid point in selector');
    
    Object.assign(this.#points.start, point);
    
    if (!this.endPoint || this.endPoint.x === null) {
      // this.setEndPoint(this.#points.start)
      // this.setEndPoint({ x: x + this.#unitSize, y: y + this.#unitSize });
    }
    
    this.emitRange()
    
    return this;
  }
  
  setEndPoint(point) {
    const { x, y } = point
    Object.assign(this.#points.end, point);
    
    // this.#points.end = {
    //   x: +x, // - 1,
    //   y: +y, // - 1,
    // };
    
    return this;
  }
  
  resetPoints() {
    this.setStartPoint({ x: null, y: null });
    this.setEndPoint({ x: null, y: null });
    
    return this;
  }
  
  updateSelection() {
    // this.#self.setAttribute('transform', `translate(${this.startPoint.x},${this.startPoint.y})`)
    
    const handle = this.#dragTargetHandle
    
    if (handle && handle.dataset.handle === 'start') {
      // this.#self.setAttribute('transform', `translate(${this.startPoint.x},${this.startPoint.y})`)
      this.#handles.start.setAttribute('cx', this.#focus.x);
      this.#handles.start.setAttribute('cy', this.#focus.y);
      
      // this.#handles.end.setAttribute('cx', this.width)
      // this.#handles.end.setAttribute('cy', this.height)
    }
    
    if (handle && handle.dataset.handle === 'end') {
      // this.#self.setAttribute('transform', `translate(${this.startPoint.x},${this.startPoint.y})`)
      this.#handles.end.setAttribute('cx', this.#focus.x);
      this.#handles.end.setAttribute('cy', this.#focus.y);
      this.#handles.start.setAttribute('cx', this.#anchor.x);
      this.#handles.start.setAttribute('cy', this.#anchor.y);
      
      // this.#handles.end.setAttribute('cx', this.width)
      // this.#handles.end.setAttribute('cy', this.height)
    }
    
    // if (handle && handle.dataset.handle === 'start') {
    //   this.#handles.start.setAttribute('cx', this.x)
    //   this.#handles.start.setAttribute('cy', this.y)
    //   this.#handles.end.setAttribute('cx', this.width)
    //   this.#handles.end.setAttribute('cy', this.height)
    
    // }
    // if (handle && handle.dataset.handle === 'end') {
    //   this.#handles.start.setAttribute('cx', this.x)
    //   this.#handles.start.setAttribute('cy', this.y)
    //   this.#handles.end.setAttribute('cx', this.width)
    //   this.#handles.end.setAttribute('cy', this.height)
    
    // }
    
    
    // this.#handles.start.setAttribute('cx', this.startPoint.x);
    // this.#handles.start.setAttribute('cy', this.startPoint.y);
    // this.#handles.end.setAttribute('transform', `translate(${this.endPoint.x},${this.endPoint.y})`)
    // this.#handles.end.setAttribute('transform', `translate(${this.width-1},${this.height-1})`)
    
    // this.#handles.end.setAttribute('cx', this.endPoint.x)
    // this.#handles.end.setAttribute('cy', this.endPoint.y)
    this.#selectionBox.setAttribute('width', this.width);
    this.#selectionBox.setAttribute('height', this.height);
    
    
  }
  
  getDistance(from, to) {
    if (!validatePoints(from, to)) {
      console.error('Invalid point in selector');
      return null;
    }
    
    return Math.abs(Math.floor((to.x - from.x) + (to.y - from.y) / 2));
  }
  
  getDistancePoint(from, to) {
    if (!validatePoints(from, to)) {
      console.error('Invalid point in selector');
      return null;
    }
    
    const x = to.x - from.x;
    const y = to.y - from.y;
    return { x, y }
    return Math.abs(Math.floor((to.x - from.x) + (to.y - from.y) / 2));
  }
  
  onDragStart(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const handle = e.target.closest('.selection-handle');
    const handleId = handle.dataset.handle
    
    if (handle) {
      if (handleId === 'start') {
        this.#anchor = this.endPoint
        this.#focus = this.startPoint
      } else {
        this.#focus = this.endPoint
        this.#anchor = this.startPoint
      }
      // this.#focus = handle
      // this.#anchor = handleId === 'start' ? this.#handles.end : this.#handles.start;
      
      this.#dragTargetHandle = handle;
      this.#self.dataset.isDragging = true;
      handle.dataset.isDragging = true;
      
      this.parent.addEventListener('pointermove', this.dragHandler);
      // this.#self.addEventListener('pointermove', this.dragHandler);
      this.parent.addEventListener('pointerup', this.dragEndHandler);
    }
  }
  
  onDragHandle(e) {
    e.stopPropagation();
    console.warn(e.target.dataset.handle)
    // if (!this.#dragTargetHandle) return;
    
    const handle = this.#dragTargetHandle;
    
    const pt = this.domPoint(e.clientX, e.clientY);
    
    if (!validatePoint(pt)) return;
    
    if (pt.x < 0 || pt.y < 0) {
      console.warn('out of range', pt.x, pt.y)
      return
    }
    
    
    const startToEnd = this.getDistancePoint(this.startPoint, this.endPoint);
    const pointToEnd = this.getDistance(pt, this.startPoint);
    
    // if (this.endPoint.x === null) {
    //   this.setEndPoint(pt)
    // }
    
    let bb = {
      left: this.startPoint.x,
      top: this.startPoint.y,
      right: this.endPoint.x,
      bottom: this.endPoint.y,
    }
    
    
    if (this.#focus.x < this.#anchor.x ||
      this.#focus.y < this.#anchor.y) {
      [this.#anchor, this.#focus] = [this.#focus, this.#anchor]
    }
    this.#dragTargetHandle.setAttribute('cx', this.#focus.x)
    this.#dragTargetHandle.setAttribute('cy', this.#focus.y)
    // if (handle.dataset.handle === 'start') {
    //   console.warn('start')
    //   // bb = this.startPoint
    
    //   const startOverlappingEnd = this.startPoint.x > this.endPoint.x || this.startPoint.y > this.endPoint.y
    
    //   if (startOverlappingEnd) {
    //     this.setDragTarget(this.#handles.end)
    
    //     // bb = this.endPoint
    //     // return
    
    //   }
    
    //   if (pt.x < bb.left || pt.x > bb.left) {
    //     this.setStartPoint({ ...this.startPoint, x: pt.x })
    //   }
    
    //   if (pt.y < bb.top || pt.y > bb.top) {
    //     this.setStartPoint({ ...this.startPoint, y: pt.y })
    //   }
    // }
    
    // if (handle.dataset.handle === 'end') {
    //   console.warn('end')
    //   // bb = this.endPoint
    
    //   const endOverlappingStart = this.startPoint.x > this.endPoint.x || this.startPoint.y > this.endPoint.y
    
    //   if (endOverlappingStart) {
    //     this.setDragTarget(this.#handles.start)
    
    //     // bb = this.startPoint
    //     // return
    //   }
    
    //   if (pt.x < bb.right || pt.x > bb.right) {
    //     this.setEndPoint({ ...this.endPoint, x: pt.x })
    //   }
    
    //   if (pt.y < bb.bottom || pt.y > bb.bottom) {
    //     this.setEndPoint({ ...this.endPoint, y: pt.y })
    //   }
    // }
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  
  onDragEnd(e) {
    this.parent.removeEventListener('pointermove', this.dragHandler);
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

console.warn('fuk')