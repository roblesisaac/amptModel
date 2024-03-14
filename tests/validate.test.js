import { describe, test, expect } from 'vitest';
import validate from '../validate';
import { errorCodes, getErrorMessage } from '../errorCodes';

describe('validate', () => {
  test('validate returns an async function', () => {
    expect(validate).toBeInstanceOf(Function);
  });

  test('validate without data to validate returns a function', async () => {
    expect(await validate({username: String})).toBeInstanceOf(Function);
  });

  test('validate without data to validate returns a usable function', async () => {
    const usernameValidator = await validate({ username: String });
    const { validated } = await usernameValidator({ username: 'testusername' });
  
    expect(validated.username).toBe('testusername');
  });

  test('simple validate(String, 1) return validated string', async () => {
    const { validated } = await validate(String, 1);

    expect(validated).toBe('1');
  });

  test('simple validate(String, undefined) returns empty string', async () => {
    const validator = await validate(String);
    const { validated } = await validator();

    expect(validated).toBe('');
  });

  test('simple validate({ type: String, lowercase }) returns validated', async () => {
    const { validated } = await validate({ type: String, lowercase: true }, 'TEST');

    expect(validated).toBe('test');
  });

  test('validates when undefined and sets empty', async () => {
    const { validated } = await validate({ 
      name: String
    }, {
      name: undefined
    });

    expect(validated.name).toBe('');
  });

  test('validates when complex undefined and sets empty', async () => {
    const { validated } = await validate({ 
      name: {
        type: String
      }
    }, {
      name: undefined
    });

    expect(validated.name).toBe('');
  });

  test(`named validate type works`, async () => {
    const { validated } = await validate({ type: 'string', strict: true }, '1234');

    expect(validated).toBe('1234');
  });

  test('lowercase', async () => {
    const { validated } = await validate({ lowercase: true }, 123);

    expect(validated).toBe(123);
  });

  test('proper', async () => {
    const { validated } = await validate({ proper: true }, 'xxxx');

    expect(validated).toBe('Xxxx');
  });

  test('proper', async () => {
    const { validated } = await validate({ proper: true }, 1234);

    expect(validated).toBe(1234);
  });

  test('wild * works as expected', async () => {
    const { validated } = await validate({ name: '*' }, { name: 'TeSt'});
    expect(validated).toEqual({ name: 'TeSt'});
  });

  test('validates in order', async () => {
    const schema = {
      name: {
        type: String,
        computed: (value) =>  `xxxx${value}`,
        minLength: 8
      }
    };

    const { validated } = await validate(schema, { name: 'TeSt'});
    expect(validated).toEqual({ name: 'xxxxTeSt'});
  });

  test('nested array throws error if not an array', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        type: [{ type: String, enum: ['admin', 'user'] }],
        strict: true
      },
    };

    try {
      await validate(testSchema, {
        username: 'XXXXXXXX',
        password: 'XXXXXXXXXXXX',
        roles: 'admin',
      });
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.ARRAY_ERROR))).toBe(true);
    }
  
  });

  test('nested array sets default if default provided', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        type: [{
          type: String,
          enum: ['admin', 'user']
        }],
        default: ['user'],
        strict: true
      }
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX'
    });

    expect(validated.roles).toEqual(['user']);
  });

  test('nested array works for []', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        type: [],
        default: ['user'],
        strict: true
      }
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX'
    });

    expect(validated.roles).toEqual(['user']);
  });

  test('nested array sets [] if not strict', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [String]
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX'
    });

    expect(validated.roles).toEqual([]);
  });

  test('nested array of simple wilds validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admin'],
    });

    expect(validated.roles).toEqual(['admin']);  
  });

  test('nested array of simple strings validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [String],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admin'],
    });

    expect(validated.roles).toEqual(['admin']);  
  });

  test('nested array of complex strings validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ type: String, enum: ['admin', 'user'] }],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admin'],
    });

    expect(validated.roles).toEqual(['admin']);  
  });

  test('nested array of complex strings throws error', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ type: String, enum: ['admin', 'user'] }],
    };

    const testItem = {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: ['admins']
    };

    try {
      await validate(testSchema, testItem)
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.ENUM_ERROR))).toBe(true);
    }
  });

  test('nested array of objects validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: [{ 
        name: String,
        permissions: [{ type: String, enum: ['read', 'write'] }]
       }],
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: [{
        name: 'admin',
        permissions: ['read'],
      }],
    });

    expect(validated.roles[0].name).toBe('admin');  
  });

  test('nested object throws error', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        name: String,
        permissions: [{ type: String, enum: ['read', 'write'] }],
      },
    };

    try {
      await validate(testSchema, {
        username: 'XXXXXXXX',
        password: 'XXXXXXXXXXXX',
        roles: 'admin',
      });
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.OBJECT_ERROR))).toBe(true);
    }
  });

  test('nested objects validate', async () => {
    const testSchema = {
      username: String,
      password: String,
      roles: {
        name: String,
        permissions: [{ type: String, enum: ['read', 'write'] }],
      },
    };

    const { validated } = await validate(testSchema, {
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXX',
      roles: {
        name: 'admin',
        permissions: ['read'],
      },
    });

    expect(validated.roles.permissions[0]).toBe('read');  
  
  });

  test('globalConfig works', async () => {
    const testSchema = { firstName: String, lastName: String };
    const globalConfig = { lowercase: true, trim: true };
    const testItem = { firstName: 'John', lastName: 'Doe ' };
    const { validated } = await validate(testSchema, testItem, { globalConfig });

    expect(validated.firstName).toBe('john');
    expect(validated.lastName).toBe('doe');  
  });

  test('setting default for undefined works', async () => {
    const testSchema = { username: { default: 'defaultUsername', type: String } };
    const { validated } = await validate(testSchema, { username: undefined });

    expect(validated.username).toBe('defaultUsername');
  });

  test('setting default for null works', async () => {
    const testSchema = { username: { default: 'defaultUsername', type: String } };
    const { validated } = await validate(testSchema, { username: null });

    expect(validated.username).toBe('defaultUsername');
  });

  test('default ignores when value provided', async () => {
    const { validated } = await validate({ default: 'a' }, 'b');

    expect(validated).toBe('b');
  });

  test('missing required field throws error', async () => {
    const testSchema = { username: String, password: { required: true, type: String } };
    const testItem = { username: 'XXXX'  };
    
    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.REQUIRED_ERROR))).toBe(true)
    }
  });

  test('having required field returns validated', async () => {
    const testSchema = { username: String, password: { type: String, required: true } };
    const { validated } = await validate(testSchema, { username: 'XXXX', password: 'XXXX'  });
    
    expect(validated.password).toBe('XXXX');
  });

  test('valid type works', async () => {
    const testSchema = { username: String };
    const testItem = { username: 'testuser' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated).toEqual({ username: 'testuser' });
  });

  test('strict invalid type throws error', async () => {
    const testSchema = { username: { type: String, strict: true } };
    const testItem = { username: 123 };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.TYPE_ERROR))).toBe(true);
    }    
  });

  test('not strict invalid type corrects', async () => {
    const testSchema = { username: String };
    const testItem = { username: 123 };
    const { validated } = await validate(testSchema, testItem);

    expect(validated.username).toBe('123')
  });

  test('not strict invalid complex type corrects', async () => {
    const testSchema = { username: { type: String } };
    const testItem = { username: 123 };
    const { validated } = await validate(testSchema, testItem);

    expect(validated.username).toBe('123')
  });

  test('valid enum works', async () => {
    const testSchema = { username: { type: String, enum: ['testuser', 'testuser2'] } };
    const testItem = { username: 'testuser' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('testuser');
  });

  test('invalid enum throws error', async () => {
    const testSchema = { username: { type: String, enum: ['testuser', 'testuser2'] } };
    const testItem = { username: 'XXXXXXXXX' };

    try {
      await validate(testSchema, testItem)
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.ENUM_ERROR))).toBe(true);
    }
  });

  test('custom validate works when custom qualifications met', async () => {
    const testSchema = { username: { type: String, validate: (value) => value.length > 3 } };
    const testItem = { username: 'XXXX' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('XXXX');  
  });

  test('custom validate throws error when custom qualifications not met', async () => {
    const testSchema = { username: { type: String, validate: (value) => value.length > 3 } };
    const testItem = { username: 'X' };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.CUSTOM_VALIDATION_ERROR))).toBe(true);
    }
  
  });

  test('computed values throw error', async () => {
    const testSchema = { username: { type: String, computed: _ => `ampt${values}` } };
    const testItem = { username: 'X' };
    

    try {
      await validate(testSchema, testItem);
    } catch(error) {
      expect(error.message.includes(getErrorMessage(errorCodes.CUSTOM_COMPUTE_ERROR))).toBe(true);  
    }
  });

  test('computed values work', async () => {
    const testSchema = { username: { type: String, computed: (value) => `ampt${value}` } };
    const testItem = { username: 'XXXX' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('amptXXXX');
  });

  test('computed works', async () => {
    const testSchema = { 
      username: { 
        type: String, 
        computed: (value, { item }) => `ampt${item.username}${value}` 
      }
    };

    const testItem = { username: 'XXXX' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('amptXXXXXXXX');
  });

  test('getter and setter works', async () => {
    const hash = value => `hashed${value}`;

    const testSchema = { 
      username: {
        type: String,
        lowercase: true,
        trim: true
      },
      userdetails: {
        set: (value, { item }) => `user details for ${item.username} with '_id:${ item.user?._id }' are ${value}`, 
        get: (value) => `USER_DETAILS: ${value.toUpperCase()} ${Date.now()}`
      },
      computedTest: {
        computed: (_, { item }) => `this was computed for ${item.username} at ${Date.now()}`
      },
      currentTime: () => Date.now(),
      createdOn: {
        set: () => Date.now()
      },
      password: {
        set: hash,
        get: (value) => value.replace('hashed', '')
      }
    };

    const testItem = {
      username: 'John doe',
      password: 'secret',
      userdetails: '<users detailed info here>'
    };

    const req = {  user: { _id: 123 } };
    const originalItem = { ...testItem, ...req };
    const { validated: validatedWithSet } = await validate(testSchema, originalItem, { action: 'set' });

    // delay 100 ms
    await new Promise(resolve => setTimeout(resolve, 200) );

    const { validated: validatedWithGet } = await validate(testSchema, validatedWithSet, { action: 'get' });
    const { validated: validatedAgain } = await validate(testSchema, validatedWithGet);

    expect(validatedWithSet.createdOn).toBe(validatedWithGet.createdOn);
    expect(validatedWithSet.currentTime).toBeLessThan(validatedWithGet.currentTime);
    expect(validatedWithSet.createdOn).toBe(validatedAgain.createdOn);
  });

  test('getter and setter works when not specified', async () => {
    const hash = value => `hashed${value}`;

    const testSchema = { 
      username: {
        type: String,
        lowercase: true,
        trim: true
      },
      userdetails: {
        set: (value, { item }) => `user details for ${item.username} with '_id:${ item.user?._id }' are ${value}`, 
        get: (value) => `USER_DETAILS: ${value.toUpperCase()} ${Date.now()}`
      },
      computedTest: {
        computed: (_, { item }) => `this was computed for ${item.username} at ${Date.now()}`
      },
      currentTime: () => Date.now(),
      createdOn: {
        set: () => Date.now()
      },
      password: {
        set: (value) => hash(value),
        get: (value) => value.replace('hashed', '')
      }
    };

    const testItem = {
      userdetails: '<users detailed info here>',
      username: 'John doe ',
      password: 'secret'
    };

    const req = {  user: { _id: 123 } };
    const originalItem = { ...testItem, ...req };
    const { validated: validatedWithSet } = await validate(testSchema, originalItem, { action: 'set' });
    
    // delay 100 ms
    await new Promise(resolve => setTimeout(resolve, 100) );

    const { validated: validatedWithGet } = await validate(testSchema, validatedWithSet);
    const { validated: validatedAgain } = await validate(testSchema, validatedWithGet);

    expect(validatedWithSet.createdOn).toBe(validatedWithGet.createdOn);
    expect(validatedWithSet.currentTime).toBeLessThan(validatedWithGet.currentTime);
    expect(validatedWithSet.createdOn).toBe(validatedAgain.createdOn);
  });

  test('getter throws error when expected', async () => {
    const testSchema = { username: { type: String, get: () => undefinedVar } };
    const testItem = { username: 'XXXXc' };

    try {
      await validate(testSchema, testItem, { action: 'get'});
    } catch (error) { 
      expect(error.message.includes(getErrorMessage(errorCodes.CUSTOM_COMPUTE_ERROR))).toBe(true);
    }
  });

  test('rules.min works', async () => {
    const testSchema = { age: { type: Number, min: 18 } };
    const testItem = { age: 19 };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.age).toBe(19);
  });

  test('rules.min throws error when expected', async () => {
    const testSchema = { age: { type: Number, min: 18 } };
    const testItem = { age: 17 };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.MIN_ERROR))).toBe(true);
    }
    
  });

  test('rules.max works', async () => {
    const testSchema = { age: { type: Number, max: 100 } };
    const testItem = { age: 80 };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.age).toBe(80);
  });

  test('rules.max throws error when expected', async () => {
    const testSchema = { age: { type: Number, max: 100 } };
    const testItem = { age: 101 };

    try {
      await validate(testSchema, testItem)
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.MAX_ERROR))).toBe(true);
    }
  });

  test('rules.minLength works', async () => {
    const testSchema = { username: { type: String, minLength: 3 } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.minLength throws error when expected', async () => {
    const testSchema = { username: { type: String, minLength: 3 } };
    const testItem = { username: 'XX' };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.MIN_LENGTH_ERROR))).toBe(true);
    }
  });

  test('rules.maxLength works', async () => {
    const testSchema = { username: { type: String, maxLength: 10 } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.maxLength throws error when expected', async () => {
    const testSchema = { username: { type: String, maxLength: 2 } };
    const testItem = { username: 'test' };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.MAX_LENGTH_ERROR))).toBe(true);
    }
  });

  test('unknown error works', async () => {
    const testSchema = { username: { type: String, maxLength: 2 } };
    const testItem = { username: 'test' };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(getErrorMessage(errorCodes.MAX_LENGTH_ERRORs)).toBe('Unknown error');
    }
  });

  test('Spanish error works', async () => {
    const testSchema = { username: { type: String, maxLength: 2 } };
    const testItem = { username: 'test' };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      const spanish = getErrorMessage(errorCodes.MAX_LENGTH_ERROR, null, 'es');
      expect(spanish).toBeDefined();
    }
  });

  test('Default to english error works', async () => {
    const testSchema = { username: { type: String, maxLength: 2 } };
    const testItem = { username: 'test' };

    try {
      await validate(testSchema, testItem);
    } catch (error) {
      expect(error.message.includes(getErrorMessage(errorCodes.MAX_LENGTH_ERROR, null, 'fr'))).toBe(true);
    }
  });

  test('rules.trim works', async () => {
    const testSchema = { username: { type: String, trim: true } };
    const testItem = { username: ' test ' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.trim ignores if not string', async () => {
    const testSchema = { username: { type: Number, trim: true } };
    const testItem = { username: 1234 };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe(1234);
  });

  test('default ignores when value provided', async () => {
    const { validated } = await validate({ name: { proper: true, set: () => 1234 }}, { name: 1234 });

    expect(validated.name).toBe(1234);
  });

  test('rules.lowercase works', async () => {
    const testSchema = { username: { type: String, lowercase: true } };
    const testItem = { username: 'TEST' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('test');
  });

  test('rules.uppercase works', async () => {
    const testSchema = { username: { type: String, uppercase: true } };
    const testItem = { username: 'test' };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('TEST');
  });

  test('rules.uppercase ignores if not string', async () => {
    const testSchema = { username: { uppercase: true, type: String,  } };
    const testItem = { username: 1234 };

    const { validated } = await validate(testSchema, testItem);
    expect(validated.username).toBe('1234');
  });

  test('rules.unique returns uniqueInstructions', async () => {
    const testSchema = { username: { type: String, unique: true } };
    const testItem = { username: 'XXXX' };

    const { uniqueFieldsToCheck } = await validate(testSchema, testItem);
    expect(uniqueFieldsToCheck).toEqual(['username']);
  });

  test('refs are set apart', async () => {
    const testSchema = { username: { type: String, unique: true, ref: 'users' } };
    const testItem = { username: 'XXXX' };

    const { uniqueFieldsToCheck, refs } = await validate(testSchema, testItem);
    expect(refs[0]).toBe('username');
  });

});