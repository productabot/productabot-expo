import * as Linking from 'expo-linking';

export default {
  prefixes: [Linking.makeUrl('/')],
  config: {
    screens: {
      auth: {
        screens: {
          login: 'login',
          signup: 'signup',
          reset: 'reset',
          terms: 'terms',
          privacy: 'privacy',
        },
      },
      app: {
        screens: {
          projects: {
            screens: {
              projects: {
                path: 'projects'
              },
              project: {
                path: 'project'
              },
              board: {
                path: 'board'
              },
              item: {
                path: 'item'
              },
              document: {
                path: 'document'
              },
            }
          },
          calendar: {
            screens: {
              calendar: {
                path: 'calendar',
              },
              entry: {
                path: 'entry'
              },
            }
          },
          notes: {
            screens: {
              notes: {
                path: 'notes'
              },
              note: {
                path: 'note'
              },
            }
          },
          tasks: {
            screens: {
              tasks: {
                path: 'tasks'
              }
            }
          },
          settings: {
            screens: {
              settings: {
                path: 'settings'
              },
              blank: {
                path: 'blank'
              },
            }
          }
        },
      },
    },
  },
};
