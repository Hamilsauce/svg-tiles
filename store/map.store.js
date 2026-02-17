import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapMeta } from '../map.service.js';

import { ref, computed, watch, reactive } from 'vue'
import { Graph, TILE_TYPE_INDEX } from '../lib/graph.model.js';
import { MAP_DOC_TEMPLATE } from '../maps.js';


const currentMap = ref(null);
const maps = ref([]);


// const loadMap2 = () => loadMap

export const useMapStore = () => {
  const isMapSaved = computed(() => !!currentMap.value.id && !currentMap.value.id.includes('TEMP'));

  const setCurrentMap = (mapDoc) => {
    currentMap.value = { ...MAP_DOC_TEMPLATE, ...mapDoc, id: mapDoc.id ?? `TEMP_MAP_${Date.now()}`, };

    return currentMap.value.id;
  };

  // const setCurrentMapById = async (mapId) => {
  //   const loaded = await loadMap2()(mapId);
  //   currentMap.value = loaded;
  // };

  // const createMap = async (map) => {
  //   currentMap.value = map;
  // };

  const saveMap = async (map) => {
    // handle updating stored maps here too?
  };

  const deleteMap = async (map) => {
    // handle updating stored maps here too?
  };

  // const createMap = async (id) => {
  //   console.warn({ id })

  //   const loaded = await loadMap(id);
  //   console.warn({ loaded })
  //   return loaded
  //   // handle updating stored maps here too?
  // };

  const createMap = async (id) => {
    console.warn({ id })

    const loaded = await loadMap(id);
    console.warn({ loaded })
    return loaded
    // handle updating stored maps here too?
  };

  const initMaps = async () => {
    maps.value = await loadMapMeta();
    // handle updating stored maps here too?
  };

  const setCurrentMapById = async (mapId) => {
    const loaded = await loadMap(mapId);
    currentMap.value = loaded;
  };


  return {
    setCurrentMap,
    createMap,
    saveMap,
    loadMap,
    deleteMap,
    isMapSaved,
    currentMap,
    initMaps,
    setCurrentMapById,
  }
};