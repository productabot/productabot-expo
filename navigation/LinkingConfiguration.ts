import * as Linking from 'expo-linking';
import { compressUuid, expandUuid } from '../scripts/uuid';
const stringify = { id: (id) => id?.length === 36 ? compressUuid(id) : id?.replace(/-/g, ''), state: (state) => '' };
const parse = { id: (id) => id?.length === 22 ? expandUuid(id) : id }

export default {
  prefixes: [Linking.makeUrl('/')],
  config: {
    screens: {
      auth: {
        screens: {
          login: 'login',
          signup: 'signup',
          reset: 'reset',
          set: 'set'
        },
      },
      app: {
        screens: {
          projectsTab: {
            screens: {
              projects: {
                path: 'projects',
                stringify,
                parse
              },
              project: {
                path: 'projects/:id/:state?',
                stringify,
                parse
              },
              document: {
                path: 'documents/:id?',
                stringify,
                parse
              },
              sheet: {
                path: 'sheets/:id?',
                stringify,
                parse
              },
              entry: {
                path: 'projects/entries/:id?',
                stringify,
                parse
              },
              task: {
                path: 'projects/tasks/:id',
                stringify,
                parse
              },
              edit_task: {
                path: 'projects/tasks/edit/:id?',
                stringify,
                parse
              },
              event: {
                path: 'projects/events/:id?',
                stringify,
                parse
              },
              budget: {
                path: 'projects/budgets/:id?',
                stringify,
                parse
              },
            }
          },
          calendarTab: {
            screens: {
              calendar: {
                path: 'calendar',
                stringify
              },
              entry: {
                path: 'calendar/entries/:id?',
                stringify,
                parse
              },
              task: {
                path: 'calendar/tasks/:id?',
                stringify,
                parse
              },
              event: {
                path: 'calendar/events/:id?',
                stringify,
                parse
              },
            }
          },
          notesTab: {
            screens: {
              notes: {
                path: 'notes',
                stringify,
                parse
              },
              note: {
                path: 'note',
                stringify,
                parse
              },
            }
          },
          tasksTab: {
            screens: {
              tasks: {
                path: 'tasks',
                stringify,
                parse
              },
              task: {
                path: 'tasks/:id/:state?',
                stringify,
                parse
              },
              edit_task: {
                path: 'tasks/edit/:id?',
                stringify,
                parse
              }
            }
          },
          timelinesTab: {
            screens: {
              timelines: {
                path: 'timelines',
                stringify,
                parse
              },
              timeline: {
                path: 'timeline/:id?/:state?',
                stringify,
                parse
              }
            }
          },
          settingsTab: {
            screens: {
              settings: {
                path: 'settings/:state?',
                stringify,
                parse
              },
              blank: {
                path: 'blank',
                stringify,
                parse
              },
              test: {
                path: 'test',
                stringify,
                parse
              },
            }
          },
          searchTab: {
            screens: {
              search: {
                path: 'search/:state?',
                stringify,
                parse
              },
            }
          }
        },
      },
    },
  },
};
