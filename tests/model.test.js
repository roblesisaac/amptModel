import { describe, test, expect  } from 'vitest';
import amptModel from '../index';
import { errorCodes, getErrorMessage } from '../errorCodes';

describe('amptModels', () => {
  const createdAt = Date.now();
  const schema = {      
    name: {
      type: String,
      unique: true,
      strict: true
    },
    createdAt: {
      set: () => createdAt,
      get: (_, { item }) => `${item.name} who is ${item.age} created at ${item.createdAt}`
    },
    lastLogin: () => Date.now(),
    age: Number,
    role: {
      type: String,
      set: (_, { item }) => item?.req?.user?.role,
      default: 'user',
      enum: ['user', 'admin']
    },
    orderId: {
      ref: `orders`
    }
  };

  const labelsConfig = {
    label1: 'name',
    label2: item => `name length is ${item.name.length}`,
    label3: {
      name: 'user_details',
      concat: ['name', 'age'],
    },
    label4: 5
  };

  const globalConfig = { lowercase: true, trim: true };
  const collectionName = 'testcollection';

  const TestModel = amptModel(collectionName, { ...schema, ...labelsConfig }, globalConfig);

  test('amptModel', async () => {
    expect(amptModel).toBeDefined();
  });

  test('amptModel.validate throws error if schema type is invalid', async () => {
    try {
      await TestModel.validate({ name: 1 });
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.TYPE_ERROR))).toBe(true);
    }
  });

  test('amptModel.validate works', async () => {
    const { validated } = await TestModel.validate({ name: 'Jane ', orderId: 'testcollection:*' }, 'set');

    expect(validated.name).toBe('jane');
    expect(validated.role).toBe('user');
    expect(validated.orderId).toBe('testcollection:*');
  });

//   test('ampModel.save works', async () => {
//     const testItem = { name: 'John  ', age: '20', orderId: 'testcollection:*'  };
//     const testProps = { req: { user: { role: 'admin' } } };
//     const response = await TestModel.save({ ...testItem, ...testProps });

//     expect(response._id).toMatch(/^testcollection/);
//     expect(response.name).toBe('john');
//     expect(response.age).toBe(20);
//     expect(response.role).toBe('admin');
//     expect(response.orderId).toBe('testcollection:*');
//   }, 30*1000);

//   test('throws error when unique field has missing label', async () => {
//     const testSchema = {
//       name: {
//         unique: true
//       }
//     };
    
//     const TestModel2 = amptModel(collectionName, { ...testSchema });

//     expect(async () => await TestModel2.save({ name: 'bill' }))
//       .rejects.toThrowError(`Unique field 'name' for '${collectionName}' must be labeled in a labelsConfig...`);
//   });

//   test('amptModel.find when the filter is a string works', async () => {
//     const responseForFilterString = await TestModel.find('testcollection:*');

//     expect(Array.isArray(responseForFilterString.items)).toBe(true);
//   }, 1000*10);

//   test('amptModel.find works for user_details', async () => {
//     const response = await TestModel.find({ user_details: 'jo' });

//     expect(response.items[0].name).toBe('john');
//   }, 1000*10);

//   test('amptModel.find rejects if filter is not object or string', () => {
//     expect(async () => await TestModel.find(true))
//       .rejects.toThrowError('Filter must be an object or string');
//   });

//   test('amptModel.find works for name', async () => {
//     const response = await TestModel.find({ name: 'john' });

//     expect(response.items[0].name).toBe('john');
//   }, 1000*10);

//   test('amptModel.findOne works for name and string', async () => {
//     const response = await TestModel.findOne({ name: 'john' });
//     const responseForFilterString = await TestModel.findOne(response._id);

//     expect(response.name).toBe('john');
//     expect(responseForFilterString.name).toBe('john');
//   }, 1000*10);

//   test('amptModel.updateWorks', async () => {
//     const updated = await TestModel.update({ name: 'john' }, { age: 30 });

//     expect(updated.age).toBe(30);
//     expect(updated.createdAt).toBe(`john who is 30 created at ${createdAt}`);
//   });

//   test('amptModel.findOne after update works', async () => {
//     const response = await TestModel.findOne({ name: 'john' });

//     expect(response.age).toBe(30);
//     expect(response.createdAt).toBe(`john who is 30 created at ${createdAt}`);
//   });

//   test('amptModel.updateWorks again', async () => {
//     const updated = await TestModel.update({ name: 'john' }, { age: 31 });

//     expect(updated.age).toBe(31);
//     expect(updated.createdAt).toBe(`john who is 31 created at ${createdAt}`);
//   });

//   test('amptModel.update throws error if no existing item found', async () => {
//     try {
//       await TestModel.update({ name: 'jane' }, { age: 31 });
//     } catch (error) {
//       expect(error.message.includes('No item found with')).toBe(true);
//     }
//   });

//   test('amptModel.findOne after update works again', async () => {
//     const response = await TestModel.findOne({ name: 'john' });

//     expect(response.age).toBe(31);
//     expect(response.createdAt).toBe(`john who is 31 created at ${createdAt}`);
//   });

//   test('amptModel.save duplicate unique key throws error', async () => {
//     expect(async () => await TestModel.save({ name: 'john' }))
//       .rejects.toThrowError(`Duplicate value for 'name' exists in collection '${collectionName}'`);
//   }, 1000*10);

//   test('amptModel.erase works', async () => {
//     const response = await TestModel.erase({ name: 'john' });

//     expect(response).toEqual({ removed: true });
//   });

//   test('amptModel.erase throws error when no matching item found', async () => {
//     try {
//       await TestModel.erase({ name: 'john' });
//     } catch (error) {
//       expect(error.message.includes(`Item not found when trying to perform erase in collection '${collectionName}' for filter`)).toBe(true);
//     }
//   });

//   test('TestModel.erase works when its a string', async () => {
//     const { _id } = await TestModel.save({ name: 'jane', age: 20 });
//     const { removed } = await TestModel.erase(_id);

//     expect(removed).toBe(true);
//   });

}, 20*1000);