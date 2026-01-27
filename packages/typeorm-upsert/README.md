# `typeorm-upsert`

## Installation

```
npm i @nest-toolbox/typeorm-upsert
```

## Usage

```
const dataTypeRepository; // typeorm repository
const bigArrayWithData = []; // this array contains existing data and new data
const conflictKey = 'unq index/key'; // you can use this function in the case you want to track collision on other key then id;

const options = { // all the options are optional
    keyNamingTransform: (k)=>k, // you can pass a callback function to change the keys in case that your having a naming convention like snake_case
    doNotUpsert: [], // array of keys that you want to ignore durning the upsert maybe a status field or something
    chunk: 1000, // by default the function chunks the array in 1000 inserts you can increase or decrease this option
    returnStatus: false, // if true, returns array of UpsertResult with status (inserted/updated) for each entity
};

const updated = await TypeOrmUpsert(dataTypeRepository, bigArrayWithData, conflictKey, {
    doNotUpsert: ['name'],
});

// With returnStatus option to get insert/update status
const results = await TypeOrmUpsert(dataTypeRepository, bigArrayWithData, conflictKey, {
    returnStatus: true,
});
// results will be an array of { entity: T, status: 'inserted' | 'updated' }
results.forEach((result) => {
    console.log(`Entity ${result.entity.id} was ${result.status}`);
});
```
