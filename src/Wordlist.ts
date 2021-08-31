export default class Wordlist {

    private static allWords: string[];


    static set(wordlistBody: string) {
        Wordlist.allWords = wordlistBody.split('\n');
    }

    // Make random word sequence.
    static mkRandomWordSeq(wordCount: number) {
        const indices = Uint32Array.from(new Array(6));
        const indices_ = Array.from(window.crypto.getRandomValues(indices));
        const words: string[] = indices_.map(i => Wordlist.allWords[i % Wordlist.allWords.length]);
        return words.join('-');
    }

}

