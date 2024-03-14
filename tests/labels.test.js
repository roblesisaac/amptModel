import { describe, test, expect } from 'vitest';
import LabelsMap from '../labelsMap';

describe('labelsMap', () => {
    const collectionName = 'testcollection';
    const errorMessage = message => `LabelMap Error for collection '${collectionName}': ${message}`;

    const labelsConfig = {
        notALabel: 'normal schema',
        label1: 'name',
        label2: (item) => `the length of the name is ${item.name.length}`,
        label3: {
            name: 'user_details',
            concat: ['name', 'age'],
        },
        label4: 5
    };

    const labelsMap = LabelsMap(collectionName, labelsConfig);

    const testItem = {
        name: 'John',
        age: '20'
    };

    test('labelsMap skipped works', async () => {
        const createdLabels = await labelsMap.createLabelKeys('testcollection', testItem, ['name']);

        expect(createdLabels.label1).toBe(undefined);
        expect(createdLabels.label2).toBe(`${collectionName}:label2_the length of the name is ${testItem.name.length}`);
        expect(createdLabels.label3).toBe(`${collectionName}:user_details_${testItem.name}:${testItem.age}`);
        expect(createdLabels.label4).toBe(`${collectionName}:5`);
    });

    test('labelsMap throws error if no mapped label found', async () => {
        expect(async () => labelsMap.getArgumentsForGetByLabel('testcollection', { firstName: 'XXXX' }))
            .rejects.toThrowError(errorMessage(`No mapped label found for filter '{"firstName":"XXXX"}'`));
    });

    test('labelsMap throws error if no mapped label found', async () => {
    
        const { labelNumber, labelValue } = labelsMap.getArgumentsForGetByLabel('testcollection', { name: '' });

        expect(labelNumber).toBe('label1');
        expect(labelValue).toBe(`${collectionName}:name_*`);
    });

    test('labelsMap.createLabelKeys works', async() => {
        const createdLabels = await labelsMap.createLabelKeys('testcollection', testItem);

        expect(createdLabels.label1).toBe(`${collectionName}:name_${testItem.name}`);
        expect(createdLabels.label2).toBe(`${collectionName}:label2_the length of the name is ${testItem.name.length}`);
        expect(createdLabels.label3).toBe(`${collectionName}:user_details_${testItem.name}:${testItem.age}`);
        expect(createdLabels.label4).toBe(`${collectionName}:5`);
    });

    test('labelsMap.getArgumentsForGetByLabel works', () => {
        const args = labelsMap.getArgumentsForGetByLabel('testcollection', { name: testItem.name });

        expect(args).toEqual({
            labelNumber: 'label1',
            labelValue: `${collectionName}:${'name'}_${testItem.name}*`,
        });
    });

    test('labelsMap.createLabelKey handles non-array concat', async () => {
        const labelsConfig = {
            label1: {
                name: 'user_details',
                concat: 'name',
            },
        };

        const labelsMap = LabelsMap(collectionName, labelsConfig);

        await expect(labelsMap.createLabelKeys('testcollection', testItem))
            .rejects.toThrowError(errorMessage(`concat must be an array for 'user_details'`));
    });

    test('labelsMap.createLabelKey handles missing concat key', async () => {
        const labelsConfig = {
            label1: {
                name: 'user_details',
                concat: ['name', 'missingKey'],
            },
        };

        const labelsMap = LabelsMap(collectionName, labelsConfig);

        await expect(labelsMap.createLabelKeys('testcollection', testItem))
            .rejects.toThrowError(errorMessage(`Concat key is missing for 'user_details'`));
    });

    test('labelsMap.createLabelKey handles error in computedConstructor', async () => {
        const labelsConfig = {
            label1: () => { throw new Error('Test error'); },
        };

        const labelsMap = LabelsMap(collectionName, labelsConfig);

        await expect(labelsMap.createLabelKeys('testcollection', testItem))
            .rejects.toThrowError(errorMessage(`Error in label1 : Test error`));
    });

    test('createLabelKeys appends validated propString to url', async () => {
        const labelsConfig = {
          label1: {
            name: 'user_details',
            concat: ['name'],
          },
        };
      
        const labelsMap = LabelsMap(collectionName, labelsConfig);
        const testItem = { name: 'John' };
      
        const result = await labelsMap.createLabelKeys('testcollection', testItem);
      
        expect(result).toEqual(expect.objectContaining({ label1: 'testcollection:user_details_John' }));
    });
      
    test('createLabelKeys returns url unchanged if propString not in validated', async () => {
        const labelsConfig = {
          label1: {
            name: 'user_details',
            concat: ['missingKey'],
          },
        };
      
        const labelsMap = LabelsMap(collectionName, labelsConfig);
        const testItem = { name: 'John', missingKey: 'Doe' };
      
        const result = await labelsMap.createLabelKeys('testcollection', testItem);
      
        expect(result).toEqual(expect.objectContaining({ label1: 'testcollection:user_details_Doe' }));
    });

    test('labelsMap.getLabelNumber throws error if no label for labelName', () => {
        const labelsConfig = {
            label1: 'name',
        };

        const labelsMap = LabelsMap(collectionName, labelsConfig);

        expect(() => labelsMap.getLabelNumber('missingLabel'))
            .toThrowError(errorMessage(`No label for 'missingLabel'`));
    });

    test('labelsMap.getArgumentsForGetByLabel handles empty filter', () => {
        const labelsConfig = {
            label1: 'name',
        };

        const labelsMap = LabelsMap(collectionName, labelsConfig);

        expect(() => labelsMap.getArgumentsForGetByLabel('testcollection', {}))
            .toThrowError(errorMessage(`No mapped label found for filter '{}'`));
    });

    test('labelsMap.hasLabel works correctly', () => {
        const labelsConfig = {
          label1: 'name',
          label2: 'age',
        };
      
        const labelsMap = LabelsMap(collectionName, labelsConfig);
      
        expect(labelsMap.hasLabel('name')).toBe(true);
        expect(labelsMap.hasLabel('age')).toBe(true);
        expect(labelsMap.hasLabel('missingLabel')).toBe(false);
    });
});
