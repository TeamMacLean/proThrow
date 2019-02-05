module.exports = {
    port: '3000',
    dbName: 'prothrow',
    secret: 'cats',
    mailServer: 'mail.nbi.ac.uk',
    ldap: {
        url: 'ldap://dc2.server.org:389',
        bindDn: 'ldapuser',
        bindCredentials: 'password',
        searchBase: 'OU=user,dc=server,dc=org',
        searchFilter: '(sAMAccountName={{username}})'
    },
    NCBIAPIKey:'',
    supportingImageRoot: './public/uploads/',
    supportingImageRootURL: '/uploads/',
    supportingImagePreviewRoot: './public/preview',
    supportingImagePreviewRootURL: '/preview/',
    supportedFileTypes: [
        '.png',
        '.PNG',
        '.jpg',
        '.JPG',
        '.jpeg',
        '.JPEG',
        '.gif',
        '.GIF'
    ],
    admins: [],
    initials: []
};
