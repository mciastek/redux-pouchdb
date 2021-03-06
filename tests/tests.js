import test from 'tape';
import { createStore, compose, applyMiddleware } from 'redux';
import { persistentStore, persistentReducer } from '../src/index';
import load from '../src/load';
import pdb from 'pouchdb-core';
import pdbMem from 'pouchdb-adapter-memory';
import timeout from 'timeout-then';

const PouchDB = pdb.plugin(pdbMem);

const db = new PouchDB('app');

const INCREMENT = 'INCREMENT';
const DECREMENT = 'DECREMENT';
const NAMESPACE_INCREMENT = 'namespaced/INCREMENT';

const createPersistentStore = compose(persistentStore(db))(createStore);

const reducer = (state = {x: 0}, action) => {
  switch(action.type) {
  case INCREMENT:
  console.log(state.x + 1);
    return { x: state.x + 1 };
  case DECREMENT:
    return { x: state.x - 1 };
  case NAMESPACE_INCREMENT:
    return { x: state.x + 1 };
  default:
    return state;
  }
};

const finalReducer = persistentReducer(reducer);

test('should persist store state', function (t) {
    t.plan(2);

    let store = createPersistentStore(finalReducer);
    console.log('loading');

    timeout(1000)
    .then(() => load(db)(reducer.name))
    .then(doc => {
      console.log('testing',store.getState().x, doc.state.x);
      t.equal(store.getState().x, doc.state.x);
    })
    .then(() => {
      console.log('incrementing');
      store.dispatch({
        type: INCREMENT
      });

      return timeout(1000)
    })
    .then(() => load(db)(reducer.name))
    .then(doc => {
      console.log('testing moar',store.getState().x, doc.state.x);
      t.equal(store.getState().x, doc.state.x);
    });
});

test('should update persisten store using namespaced actions', function(t) {
  t.plan(1);

  const namespacedReducer = persistentReducer(reducer, reducer.name, 'namespaced');
  let store = createPersistentStore(namespacedReducer);

  timeout(1000)
  .then(() => {
    console.log('incrementing by namespaced action');
    store.dispatch({
      type: NAMESPACE_INCREMENT
    });

    return timeout(1000);
  })
  .then(() => load(db)(reducer.name))
  .then(doc => {
    t.equal(store.getState().x, doc.state.x);
  });
});
