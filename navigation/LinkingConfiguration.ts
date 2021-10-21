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
                path: 'project/:id?'
              },
              entry: {
                path: 'projects/entry/:id?'
              },
              task: {
                path: 'projects/task/:id?'
              },
              edit_task: {
                path: 'projects/task/edit/:id?'
              },
            }
          },
          calendar: {
            screens: {
              calendar: {
                path: 'calendar',
              },
              entry: {
                path: 'entry/:id?'
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
              },
              task: {
                path: 'task/:id?'
              },
              edit_task: {
                path: 'task/edit/:id?'
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
