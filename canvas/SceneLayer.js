import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

export class SceneLayer extends CanvasObject {
  #name = null
  #objects = []
  
  constructor(ctx, name, options = {}) {
    super(ctx, 'layer', {
      ...options,
      id: `${name}-layer`,
      dataset: {
        layerName: name,
      },
    });
    
    this.#name = name;
  };
}