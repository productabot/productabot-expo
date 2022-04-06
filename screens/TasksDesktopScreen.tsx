import * as React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { MultipleContainers } from "../components/dndkit/MultipleContainers";
import { useTheme } from '@react-navigation/native';

export default function TasksDesktopScreen({ refresh, setLoading, loading, navigation, projectScreen, givenProjectId = '' }: any) {
    const [tasks, setTasks] = React.useState({ backlog: [], selected: [], in_progress: [], done: [] });
    const [projects, setProjects] = React.useState([]);
    const [project, setProject] = React.useState(givenProjectId);
    const [hiddenProject, setHiddenProject] = React.useState('');
    const [priority, setPriority] = React.useState('');
    const [details, setDetails] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [showContainers, setShowContainers] = React.useState({ backlog: true, selected: true, in_progress: true, done: true });
    const { colors } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [refresh, project, hiddenProject, category, details, priority])
    );

    React.useEffect(() => {
        onRefresh();
    }, [refresh, project, hiddenProject, category, details, priority]);

    let onRefresh = async () => {
        setLoading(true);
        let tasksData = await API.graphql(graphqlOperation(`{
            ${['backlog', 'selected', 'in_progress', 'done'].map(obj => `${obj}: tasks(order_by: {root_order: desc}, where: {status: {_eq: "${obj}"}
            ${project.length > 0 ? `, project_id: {_eq: "${project}"}` : ``}
            ${hiddenProject.length > 0 ? `, project_id: {_neq: "${hiddenProject}"}` : ``}
            ${category.length > 0 ? `, category: {_ilike: "%${category}%"}` : ``}
            ${details.length > 0 ? `, details: {_ilike: "%${details}%"}` : ``}
            ${priority.length > 0 ? `, priority: {_eq: "${priority}"}` : ``}
        }) {
              id
              created_at
              category
              details
              status
              root_order
              project {
                  image
              }
              comments_aggregate {
                  aggregate {
                    count
                  }
              }
            }`).join(' ')}
            projects(order_by: {name: asc}, where: {archived: {_eq: false}}) {
              id
              name
              image
            }
          }`));
        setTasks({
            backlog: tasksData.data.backlog.map(obj => { obj.image = obj.project.image; obj.count = obj.comments_aggregate.aggregate.count; delete obj.project; delete obj.comments_aggregate; return obj; }),
            selected: tasksData.data.selected.map(obj => { obj.image = obj.project.image; obj.count = obj.comments_aggregate.aggregate.count; delete obj.project; delete obj.comments_aggregate; return obj; }),
            in_progress: tasksData.data.in_progress.map(obj => { obj.image = obj.project.image; obj.count = obj.comments_aggregate.aggregate.count; delete obj.project; delete obj.comments_aggregate; return obj; }),
            done: tasksData.data.done.map(obj => { obj.image = obj.project.image; obj.count = obj.comments_aggregate.aggregate.count; delete obj.project; delete obj.comments_aggregate; return obj; })
        });
        setProjects(tasksData.data.projects);
        setLoading(false);
    }

    const saveTasks = async (tasks, task) => {
        if (tasks) {
            //save the order of all tasks
            await API.graphql(graphqlOperation(`mutation {
                ${task.id ? `saveTask: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {status: "${task.status}"}) {id}` : ''}
                ${['backlog', 'in_progress', 'done'].map(
                status => tasks[status].map((task, taskIndex) => `saveTasks${status}${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {root_order: ${tasks[status].length - taskIndex - 1}}) {id}`).join(', ')
            ).join(',')}}`));
        }
    }

    return (
        <div style={{ width: '100%', paddingTop: projectScreen ? 0 : 50, marginLeft: 'auto', marginRight: 'auto', height: '100%' }}>
            {!projectScreen &&
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', color: '#fff', fontFamily: 'arial', marginBottom: 10 }}>
                    filters:
                    <select style={{ width: 150, backgroundColor: colors.background, color: colors.text, padding: 5, borderRadius: 5, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setProject(e.target.value) }}>
                        <option value="">show all projects</option>
                        {projects.map(obj => { return (<option value={obj.id}>{obj.name}</option>) })}
                    </select>
                    <select style={{ width: 150, backgroundColor: colors.background, color: colors.text, padding: 5, borderRadius: 5, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setHiddenProject(e.target.value) }}>
                        <option value="">hide no projects</option>
                        {projects.map(obj => { return (<option value={obj.id}>{obj.name}</option>) })}
                    </select>
                    <select style={{ width: 150, backgroundColor: colors.background, color: colors.text, padding: 5, borderRadius: 5, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setPriority(e.target.value) }}>
                        <option value="">show all priorities</option>
                        <option value="low">low priority</option>
                        <option value="medium">medium priority</option>
                        <option value="high">high priority</option>
                    </select>
                    <input placeholder="search by tag" style={{ width: 150, backgroundColor: colors.background, color: colors.text, padding: 5, borderRadius: 5, borderStyle: 'solid', borderWidth: 1, height: 17, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setCategory(e.target.value) }} />
                    <input placeholder="search by details" style={{ width: 150, backgroundColor: colors.background, color: colors.text, padding: 5, borderRadius: 5, borderStyle: 'solid', borderWidth: 1, height: 17, marginLeft: 5, marginRight: 5 }} onChange={(e) => { setDetails(e.target.value) }} />
                </div>}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', color: '#ccc', fontFamily: 'arial', marginBottom: 5, fontSize: 14 }}>
                {[{ key: 'backlog', label: 'backlog', icon: '◔', leftDistance: 10 }, { key: 'selected', label: 'selected', icon: '◑', leftDistance: (showContainers.backlog && showContainers.in_progress && showContainers.done) ? '33%' : (showContainers.backlog && showContainers.in_progress || showContainers.backlog && showContainers.done) ? '50%' : 40 }, { key: 'in_progress', label: 'in progress', icon: '◕', rightDistance: (showContainers.backlog && showContainers.selected && showContainers.done) ? '33%' : (showContainers.selected && showContainers.done || showContainers.backlog && showContainers.done) ? '50%' : 40 }, { key: 'done', label: 'done', icon: '⬤', rightDistance: 10 }].map(({ key, label, icon, leftDistance, rightDistance }) =>
                    showContainers[key] ?
                        <div onClick={() => { setShowContainers({ ...showContainers, [key]: !showContainers[key] }) }} style={{ color: colors.subtitle, cursor: 'pointer' }}>{icon} {label} ({tasks[key].length}) <span onClick={() => { navigation.push('edit_task', { status: 'backlog', project_id: project }) }} style={{ cursor: 'pointer', backgroundColor: '#0075ff', borderRadius: 5, padding: '2px 5px', color: '#ffffff', marginLeft: 5 }}>add +</span></div>
                        :
                        <div onClick={() => { setShowContainers({ ...showContainers, [key]: !showContainers[key] }) }} style={{ color: colors.subtitle, cursor: 'pointer', position: 'absolute', ...(leftDistance && { left: leftDistance }), ...(rightDistance && { right: rightDistance }) }}>{icon}</div>
                )}
            </div>
            <MultipleContainers activationConstraint={{ distance: 1 }} scrollable items={tasks} setItems={setTasks} saveTasks={saveTasks} heightOffset={projectScreen ? 220 : 130} onRefresh={onRefresh} showContainers={showContainers} />
        </div>
    );
}