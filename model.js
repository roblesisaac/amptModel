import { data } from '@ampt/data';
import validator from './validate';
import generateDate from './utils/generate-date';
import LabelsMap from './labelsMap';

export default function(collectionNameConfig, schemaConfig, globalConfig) {
  const labelsMap = LabelsMap(collectionNameConfig, schemaConfig);
  const schema = extractSchema(schemaConfig);

  function buildId(yyyymmdd) {
    const random = Math.random().toString(16).substring(2);
    return `${generateDate(yyyymmdd)}_${random}`;
  }

  function buildSchema_Id(context, includeDate) {
    const sort = includeDate 
      ? `:${buildId()}` 
      : '';

    if(typeof collectionNameConfig === 'string') {
      return `${collectionNameConfig}${sort}`;
    }

    if(!Array.isArray(collectionNameConfig)) {
      throw new Error('Collection name must be a string or array of strings');
    }

    try {
      const [collectionName, ...props] = collectionNameConfig;

      let _id = collectionName;

      for (const propName of props) {
        if(!context.hasOwnProperty(propName)) {
          throw new Error(`Error building _id: Property '${propName}' does not exist in context..`);
        }

        const propValue = String(context[propName]).replaceAll(':', '-');

        _id += `-${propValue}`;
      }
      
      return `${_id}${sort}`;

    } catch (error) {
      throw new Error(`Error building schema_id for ${collectionNameConfig}: ${error.message}`);
    }
  }

  async function checkForDuplicate(validated, uniqueField) {
    if(!labelsMap.hasLabel(uniqueField)) {
      throw new Error(`Unique field '${uniqueField}' for '${collectionNameConfig}' must be labeled in a labelsConfig...`);
    }

    const duplicate = await findOne({ [uniqueField]: validated[uniqueField], ...validated });

    if(!!duplicate && duplicate?._id !== validated?._id) {
      throw new Error(`Duplicate value for '${uniqueField}' exists in collection '${collectionNameConfig}'`);
    }
  }

  function extractCollectionFromId(id) {
    return id.split(':')[0];
  }
  
  function extractSchema(schemaConfig) {
    const schema = {};

    for(const schemaKey in schemaConfig) {
      if(labelsMap.isLabel(schemaKey)) {
        continue;
      }

      schema[schemaKey] = schemaConfig[schemaKey];
    }

    return schema;
  }

  async function fetchRef(validated, ref) {
    const refKey = validated[ref];

    return typeof refKey === 'string'
      ? await data.get(refKey)
      : ref;
  }

  async function find(filter, options) {
    if(!filter || Object.keys(filter).length === 0) {
      filter = `${collectionNameConfig}:*`;
    }
    
    if(typeof filter === 'string') {
      const response = await data.get(filter, options);

      if(filter?.includes?.('*') & responseIsNull(response)) {
        return { items: [] };
      }

      const items = response.hasOwnProperty('items') && response.items?.[0]?.key && response.items?.[0]?.value
        ? await validateItems(response.items)
        : await validateItems({ key: filter, value: response })

      return { items, next: response.next, lastKey: response.lastKey };
    };

    if(!isObject(filter)) {
      throw new Error('Filter must be an object or string');
    };

    const _id = buildSchema_Id(filter);
    const { labelNumber, labelValue } = labelsMap.getArgumentsForGetByLabel(_id, filter);

    const foundResponse = await data.getByLabel(labelNumber, labelValue, options);
    const { items: foundItems, lastKey, next } = foundResponse;
    const validatedItems = await validateItems(foundItems);

    return { items: validatedItems, lastKey, next };
  }

  async function findAll(filter, options) {
    let response = await find(filter, options);
    let allItems = [...response.items];
    
    while (response.lastKey) {
      response = await find(filter, { start: response.lastKey });
      const items = response.items || response;
      allItems = [...allItems, ...items];
    }

    return allItems;  
  }

  async function findOne(filter) {
    const { items } = await find(filter);

    return items[0];
  }

  function isObject(value) {
    return typeof value === 'object' && !Array.isArray(value);
  }

  function makeArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  function responseIsNull(response) {
    if (response === null || response === undefined) {
      return true;
    }

    if (Array.isArray(response) && response.length === 0) {
      return true;
    }

    if(response.items && response.items.length === 0) {
      return true;
    }

    if (typeof response === 'object' && Object.keys(response).length === 0) {
      return true;
    }

    return false;
  }

  async function save(value) {
    const { validated, uniqueFieldsToCheck } = await validate(value, 'set');

    for(const uniqueField of uniqueFieldsToCheck) {
      await checkForDuplicate(validated, uniqueField);
    }

    const _id = value._id || buildSchema_Id(validated, true);
    const collectionId = extractCollectionFromId(_id);

    const createdLabels = await labelsMap.createLabelKeys(collectionId, validated);    
    
    const saved = await data.set(_id, validated, { ...createdLabels });
    const { validated: validatedSaved } = await validate(saved, 'get');

    return { _id, ...validatedSaved };
  }

  async function update(filter, updates) {
    const existingItem = await findOne(filter);

    if(!existingItem) {
      throw new Error(`No item found with filter '${JSON.stringify(filter)}`);
    }

    const { validated:validatedUpdate, uniqueFieldsToCheck, skipped } = await validate({ ...existingItem, ...updates });
    const existingId = existingItem._id;

    for(const uniqueField of uniqueFieldsToCheck) {
      await checkForDuplicate({ _id: existingId, ...validatedUpdate }, uniqueField);
    }

    const collectionFromId = extractCollectionFromId(existingId);
    const createdLabels = await labelsMap.createLabelKeys(collectionFromId, validatedUpdate, skipped);

    const updated = await data.set(existingId,
      validatedUpdate, 
      createdLabels
    );

    const withGetters = await validate({ ...existingItem, ...updated }, 'get');

    return { _id: existingItem._id, ...withGetters.validated };
  }

  async function validate(dataToValidate, action) {
    return await validator(schema, dataToValidate, { globalConfig, action });
  }

  async function validateItems(items, action='get') {
    const validatedItems = [];

    for (const item of makeArray(items)) {
      const { validated: validatedFound, refs } = await validate(item.value, action);

      if(refs?.length) {
        for(const ref of refs) {
          validatedFound[ref] = await fetchRef(validatedFound, ref)
        }
      }
      
      validatedItems.push({ _id: item.key, ...validatedFound }); 
    }

    return validatedItems;
  }

  return {
    validate,
    labelsMap,
    save,
    find,
    findAll,
    findOne,
    update,
    erase: async function(filter) { 
      if(typeof filter === 'string') {
        return {
          removed: await data.remove(filter)
        }
      }

      const { _id } = await findOne(filter) || {};

      if(!_id) {
        throw new Error(`Item not found when trying to perform erase in collection '${collectionNameConfig}' for filter '${JSON.stringify(filter)}'`);
      }

      const isRemoved = await data.remove(_id);
      
      return {
        removed: isRemoved
      }
    }
  };
};