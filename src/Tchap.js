import MatrixClientPeg from './MatrixClientPeg';

/**
 * Tchap utils.
 */
class Tchap {

    /**
     * Return a short value for getDomain().
     * @returns {string}
     */
    static getShortDomain() {
        const cli = MatrixClientPeg.get();
        const baseDomain = cli.getDomain();
        const domain = baseDomain.split('.tchap.gouv.fr')[0].split('.').reverse().filter(Boolean)[0];

        return domain || 'tchap';
    }

    /**
     * Return a short value for getDomain().
     * @returns {string}
     */
    static getDomainFromAlias(alias) {
        const domain = alias.split(':').reverse()[0].split('.tchap.gouv.fr')[0].split('.').filter(Boolean).reverse()[0];

        return domain || 'tchap';
    }
}

module.exports = Tchap;
