import { EventEmitter } from 'https://hamilsauce.github.io/hamhelper/event-emitter.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { template, utils, download } = ham;

const SVG_NS = 'http://www.w3.org/2000/svg';

const validatePoint = ({ x, y }) => {
  return !isNaN(+x) && !isNaN(+y) ? true : false;
};

const validatePoints = (...points) => {
  return points.every(point => !!point && validatePoint(point));
};

const minVector = (pt1, pt2) => {
  if (!validatePoints(pt1, pt2)) return null;
  
  return {
    x: Math.min(pt1.x, pt2.x),
    y: Math.min(pt1.y, pt2.y),
  }
};

const maxVector = (pt1, pt2) => {
  if (!validatePoints(pt1, pt2)) return null;
  
  return {
    x: Math.max(pt1.x, pt2.x),
    y: Math.max(pt1.y, pt2.y),
  }
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
    
    this.focus = this.#points.start
    this.anchor = this.#points.end
    
    
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
    
    // this.#self.addEventListener('pointerdown', this.dragStartHandler);
    this.#handles.start.addEventListener('pointerdown', this.dragStartHandler);
    this.#handles.end.addEventListener('pointerdown', this.dragStartHandler);
    
    window.selectionBox = this;
  }
  
  get isSelecting() { return Object.values(this.#handles).some((handle) => handle.dataset.isDragging === 'true'); };
  
  get parent() { return this.#self.parentElement; };
  
  get isRendered() { return !!this.parent; };
  
  get dom() { return this.#self; };
  
  // get startPoint() { return this.#points.start; };
  // get endPoint() { return this.#points.end; };
  
  get startPoint() { return minVector(this.anchor, this.focus) }
  get endPoint() { return maxVector(this.anchor, this.focus) }
  
  
  get boundingBox() { return this.#selectionBox.getBoundingClientRect(); };
  
  get width() { return this.startPoint.x - this.endPoint.x || this.#unitSize; }
  
  get height() { return this.startPoint.y - this.endPoint.y || this.#unitSize; }
  
  get x() { return +this.startPoint.x; }
  get y() { return +this.startPoint.y; }
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
      handle.setAttribute('transform', 'translate(1,1)')
      // handle.setAttribute('cx', 1);
      // handle.setAttribute('cy', 1);
      
      // handle.style.transform = 'translate(1,1)'
      
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
    
    // this.resetPoints();
    
    return this;
  }
  
  swapPointRoles() {
    [this.anchor, this.focus] = [this.focus, this.anchor]
  }
  
  setStartPoint(point) {
    // console.warn({ point })
    
    // if (!validatePoint(point)) return console.error('Invalid point in selector');
    
    // Object.assign(this.#points.start, {
    //   x: +x,
    //   y: +y,
    // });
    Object.assign(this.#points.start, point);
    
    // this.#points.start = {
    //   x: +x,
    //   y: +y,
    // };
    
    // if (!this.endPoint || this.endPoint.x === null) {
    //   this.setEndPoint(this.#points.start)
    //   // this.setEndPoint({ x: x + this.#unitSize, y: y + this.#unitSize });
    // }
    
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
    // this.#selectionBox.setAttribute('x', this.startPoint.x);
    // this.#selectionBox.setAttribute('y', this.startPoint.y);
    this.#self.setAttribute('transform', `translate(${this.startPoint.x},${this.startPoint.y})`)
    // this.#selectionBox.setAttribute('width', this.endPoint.x);
    // this.#selectionBox.setAttribute('height', this.endPoint.y);
    this.#selectionBox.setAttribute('width', this.width);
    this.#selectionBox.setAttribute('height', this.height);
    
    // this.#handles.start.setAttribute('cx', this.startPoint.x);
    // this.#handles.start.setAttribute('cy', this.startPoint.y);
    // this.#handles.end.setAttribute('transform', `translate(${this.endPoint.x},${this.endPoint.y})`)
    // this.#handles.end.setAttribute('transform', `translate(${this.width-1},${this.height-1})`)
    
    // this.#handles.end.setAttribute('cx', this.endPoint.x + 1) // - this.startPoint.x);
    // this.#handles.end.setAttribute('cy', this.endPoint.y + 1) // - this.startPoint.y);
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
    
    if (handle) {
      const handleId = handle.dataset.handle
      
      // if (handleId === 'start') {
      //   this.#handles.end.removeEventListener('pointerdown', this.dragStartHandler);
      //   this.#handles.end.removeEventListener('pointermove', this.dragHandler);
      // } else {
      //   this.#handles.start.removeEventListener('pointermove', this.dragHandler);
      //   this.#handles.start.removeEventListener('pointerdown', this.dragStartHandler);
      
      // }
      
      this.#dragTargetHandle = handle;
      this.#self.dataset.isDragging = true;
      handle.dataset.isDragging = true;
      this.parent.addEventListener('pointermove', this.dragHandler);
      // this.#self.addEventListener('pointermove', this.dragHandler);
      this.parent.addEventListener('pointerup', this.dragEndHandler);
      
      if (handle.dataset.handle === 'start') {
        this.focus = this.#points.start;
        this.anchor = this.#points.end;
      }
      else {
        this.anchor = this.#points.start;
        this.focus = this.#points.end;
      }
    }
  }
  
  onDragHandle(e) {
    e.stopPropagation();
    
    if (!this.#dragTargetHandle) return;
    
    const handle = this.#dragTargetHandle;
    
    const pt = this.domPoint(e.clientX, e.clientY);
    
    if (!validatePoint(pt)) return;
    
    if (pt.x < 0 || pt.y < 0) {
      console.warn('out of range', pt.x, pt.y)
      return
    }
    console.table({
      start: this.startPoint,
      end: this.endPoint,
      focus: this.focus,
      anchor: this.anchor,
    })
    
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
    
    if (
      this.focus.x < this.anchor.x ||
      this.focus.y < this.anchor.y
    ) {
      this.swapPointRoles()
    }
    
    Object.assign(this.focus, pt)
    
    this.updateSelection();
    
    this.emitRange();
  }
  
  onDragEnd(e) {
    this.parent.removeEventListener('pointermove', this.dragHandler);
    this.parent.removeEventListener('pointerup', this.dragEndHandler);
    this.#self.dataset.isDragging = false;
    
    this.#dragTargetHandle.dataset.isDragging = false;
    
    this.#dragTargetHandle = null;
    // this.anchor = null;
    // this.focus = null;
    
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