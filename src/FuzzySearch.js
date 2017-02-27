import Levenshtein from 'liblevenshtein';
import _at from 'lodash/at';
import _flatMap from 'lodash/flatMap';
import _sortBy from 'lodash/sortBy';
import _keys from 'lodash/keys';

class KeyMap {
    keys: Array<String>;
    objectMap: {[String]: Array<Object>};
}

const DEFAULT_RESULT_COUNT = 10;
const DEFAULT_DISTANCE = 5;

export default class FuzzySearch {

    static valuesToKeyMap(objects: Array<Object>, keys: Array<String>): KeyMap {
        const keyMap = new KeyMap();
        const map = {};
        const priorities = {};

        objects.forEach((object, i) => {
            const keyValues = _at(object, keys);
            // console.log(object, keyValues, keys);
            for (const keyValue of keyValues) {
                if (!map.hasOwnProperty(keyValue)) {
                   map[keyValue] = [];
                }
                map[keyValue].push(object);
            }
            priorities[object] = i;
        });

        keyMap.objectMap = map;
        keyMap.keys = _sortBy(Object.keys(map), [value => priorities[value]]);
        return keyMap;
    }

    constructor(objects: Array<Object>, options: {[Object]: Object} = {}) {
        this.options = options;
        this.keys = options.keys;
        this.setObjects(objects);
    }

    setObjects(objects: Array<Object>) {
        this.keyMap = FuzzySearch.valuesToKeyMap(objects, this.keys);

        this.matcher = new Levenshtein.Builder()
            .dictionary(this.keyMap.keys, false)
            .algorithm('transposition')
            .sort_candidates(true)
            .include_distance(false)
            .maximum_candidates(this.options.resultCount || DEFAULT_RESULT_COUNT) // result count 0 doesn't make much sense
            .build();
    }

    search(query: String): Array<Object> {
        const d = this.options.distance || DEFAULT_DISTANCE;
        const candidates = this.matcher.transduce(query.toLowerCase(), d);
        return _flatMap(candidates, candidate => this.keyMap.objectMap[candidate]);
    }
}