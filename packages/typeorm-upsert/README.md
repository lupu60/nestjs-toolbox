# `typeorm-upsert`

## Installation
```
npm i @nest-toolbox/typeorm-upsert
```

## Usage

```
const dataTypeRepository // typeorm repository
const bigArrayWithData = [] // this array contains existing data and new data

const updated = await TypeOrmUpsert(dataTypeRepository, bigArrayWithData, 'unq key', {
    doNotUpsert: ['name'],
});
```
