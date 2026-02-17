import { mapSyncHelpers, dbAdd, dbGet, dbGetAll, dbUpdate, getFields, dbDelete } from './firestore.js';
import { maps, mapStorageFormatter } from './maps.js';

const { collection, doc, writeBatch, db } = mapSyncHelpers;

const cache = new Map();

export const updateMap = async (mapToStore) => {
  const id = await dbUpdate('maps', mapToStore.id, mapToStore);

  return id;
};

export const storeMap2 = async (mapToStore) => {
  const { tileData, ...formatted } = mapStorageFormatter(mapToStore);

  const id = doc(collection(db, "mapIndex")).id;

  const batch = writeBatch(db);

  batch.set(doc(db, "mapIndex", id), formatted);
  batch.set(doc(db, "tileData", id), {
    id,
    tileData,
    width: formatted.width,
    height: formatted.height,
  });

  await batch.commit();
  return id;
};

export const storeMap = async (mapToStore) => {
  const { tileData, ...formatted } = mapStorageFormatter(mapToStore);

  const id = mapToStore?.id ?? doc(collection(db, "mapIndex")).id;

  const mapIndexRef = doc(db, "mapIndex", id);
  const tileDataRef = doc(db, "tileData", id);

  const batch = writeBatch(db);

  batch.set(
    mapIndexRef,
    { ...formatted, id },
    { merge: true }
  );

  batch.set(
    tileDataRef,
    {
      id,
      tileData,
      width: formatted.width,
      height: formatted.height,
    },
    { merge: true }
  );

  await batch.commit();

  return id;
};
// export const storeMap = async (mapToStore) => {
//   const { tileData, ...formatted } = mapStorageFormatter(mapToStore);
//   console.warn({ formatted, tileData })

//   const id = await dbAdd('mapIndex', formatted);

//   const res = await dbAdd('tileData', {
//     id,
//     tileData,
//     width: formatted.width,
//     height: formatted.height,
//   });

//   return id;
// }

export const storeMaps = async (mapsToStore = maps) => {
  const ids = Object.values(mapsToStore).map(async (map, i) => {
    return await storeMap(map);
  });

  return ids;
};

export const loadMapMeta = async () => {
  // const fetched = await getFields('mapIndex', ['name', 'meta', 'width', 'height']);
  const fetched = await dbGetAll('mapIndex');

  console.warn('loadMapMeta', fetched);

  return fetched;
};

export const loadMap = async (id) => {
  const fetched = await dbGet('tileData', id);
  console.warn('loadMap', fetched);

  fetched.id = id;
  return fetched;
};

export const loadMaps = async (asMap = false) => {
  const fetched = await dbGetAll('maps');
  console.warn('fetched', fetched);

  fetched.forEach((m, i) => {
    cache.set(m.id, m);
  });

  return asMap ? [...cache.entries()]
    .reduce((acc, [id, m]) => ({ ...acc, [id]: m }), {}) : [...cache.entries()];
};

export const clearMaps = async () => {
  const savedMaps = cache.size > 0 ? [...cache.entries()] : await dbGetAll('maps');

  console.warn('savedMaps', savedMaps);

  savedMaps.forEach(async ({ id, ...m }, i) => {
    await dbDelete('maps', id);
    cache.delete(id);
  });

  return true;
};