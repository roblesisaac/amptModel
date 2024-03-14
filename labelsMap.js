export default function createLabelMap(collectionName, config) {
  const validLabels = new Set(['label1', 'label2', 'label3', 'label4', 'label5']);
  const { labelNames, labelsConfig } = init(config);

  function buildUrl(url, validated, labelName) {
    const propString = String(labelName);

    return `${url}_${validated[propString]}`;
  }

  async function createLabelKey(_id, labelName, labelNumber, validated) {
    const labelConfig = labelsConfig[labelNumber];
    const url = `${_id}:${labelName}`;
  
    if (isObject(labelConfig) && labelConfig.concat) {
      const { concat } = labelConfig;
  
      if (!Array.isArray(concat)) {
        handleError(`concat must be an array for '${labelName}'`);
      }
  
      if (!concat.every(key => key in validated)) {
        handleError(`Concat key is missing for '${labelName}'`);
      }
  
      const concattedValue = concat.map(key => validated[key]).join(':');
  
      return `${url}_${concattedValue}`;
    }
  
    if (labelName === labelConfig) {
      return buildUrl(url, validated, labelName);
    }
  
    const computedConstructor = typeof labelConfig === 'function'
      ? labelConfig
      : labelConfig.computed || labelConfig.value || labelConfig;
  
    if (typeof computedConstructor === 'function') {
      try {
        const computedOutput = await computedConstructor(validated, { item: validated, labelName });
        return `${url}_${computedOutput}`;
      } catch (error) {
        handleError(`Error in ${labelName} : ${error.message}`);
      }
    }
  
    return url;
  }

  function createLabelValue(_id, labelName, labelValue) {
    if (!labelValue.includes('*')) {
      labelValue += '*';
    }

    return `${_id}:${labelName}_${labelValue}`;
  }

  function handleError(message) {
    throw new Error(`LabelMap Error for collection '${collectionName}': ${message}`);
  }

  function isObject(input) {
    return typeof input === 'object' && !Array.isArray(input);
  }

  function getFirstLabeledKeyAndValue(inputObject) {
    const keys = Object.keys(inputObject);

    for (const key of keys) {
      if (key in labelNames) {
        return {
          objKey: key,
          objValue: inputObject[key]
        };
      }
    }
  }

  function init(config) {
    const labelsConfig = {};
    const labelNames = {};

    const configKeys = Object.keys(config);
    const configLength = configKeys.length;

    for (let i = 0; i < configLength; i++) {
      const labelNumber = configKeys[i];

      if (!isLabel(labelNumber)) {
        continue;
      }

      const labelConfig = labelsConfig[labelNumber] = config[labelNumber];

      const labelName = typeof labelConfig === 'function'
        ? labelNumber
        : labelConfig.name || labelConfig;

      labelNames[labelName] = labelNumber;
    }

    return { labelsConfig, labelNames };
  }

  function isLabel(input) {
    return validLabels.has(input);
  }

  return {
    collectionName,
    labelsConfig,
    labelNames,
    createLabelKeys: async function (_id, validated, skipped) {
      const createdLabelKeys = {};

      for (const labelName in labelNames) {
        if (skipped?.includes(labelName)) {
          continue;
        }

        const labelNumber = this.getLabelNumber(labelName);
        const labelKey = await createLabelKey(_id, labelName, labelNumber, validated);

        createdLabelKeys[labelNumber] = labelKey;
      }
      return createdLabelKeys;
    },
    hasLabel(uniqueField) {
      return !!labelNames[uniqueField];
    },
    isLabel,
    getLabelNumber: (labelName) => {
      const labelNumber = labelNames[labelName];

      if (!labelNumber) {
        handleError(`No label for '${labelName}'`);
      }

      return labelNumber;
    },
    getArgumentsForGetByLabel(_id, filter) {
      const { objKey, objValue } = getFirstLabeledKeyAndValue(filter) || {};

      if (!objKey) {
        handleError(`No mapped label found for filter '${JSON.stringify(filter)}' for collection '${collectionName}'`);
      }

      const labelValue = createLabelValue(_id, objKey, objValue || '');

      return {
        labelNumber: this.getLabelNumber(objKey),
        labelValue
      };
    }
  };
}