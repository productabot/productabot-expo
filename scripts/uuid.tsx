export function compressUuid(uuid: string) {
    try {
        return Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64').replace('==', '').replace(/\+/g, '-').replace(/\//g, '_');
    }
    catch (err) {
        return uuid;
    }
}

export function expandUuid(base64: string) {
    try {
        return Buffer.from(base64.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString('hex');
    }
    catch (err) {
        return uuid;
    }
}