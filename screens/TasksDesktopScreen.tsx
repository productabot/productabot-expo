import * as React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { MultipleContainers } from "../components/dndkit/MultipleContainers";
import { useTheme } from '@react-navigation/native';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import { Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import InputComponent from '../components/InputComponent';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function TasksDesktopScreen({ refresh, setLoading, loading, navigation, projectScreen, givenProjectId = '' }: any) {
    const [tasks, setTasks] = React.useState({ backlog: [], selected: [], in_progress: [], done: [] });
    const [projects, setProjects] = React.useState([]);
    const [project, setProject] = React.useState(givenProjectId);
    const [hiddenProject, setHiddenProject] = React.useState('');
    const [priority, setPriority] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [showContainers, setShowContainers] = React.useState({ backlog: true, selected: true, in_progress: true, done: true });
    const { colors } = useTheme();
    const [contextPosition, setContextPosition] = React.useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const [confetti, setConfetti] = React.useState(false);
    const windowDimensions = useWindowDimensions();
    const menuRef = React.useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [refresh, project, hiddenProject, search, priority])
    );

    React.useEffect(() => {
        onRefresh();
    }, [refresh, project, hiddenProject, search, priority]);

    React.useEffect(() => {
        if (contextPosition.x > 0 && contextPosition.y > 0) { menuRef.current.open(); }
    }, [contextPosition]);

    let onRefresh = async () => {
        setLoading(true);
        let tasksData = await API.graphql(graphqlOperation(`{
            ${['backlog', 'selected', 'in_progress', 'done'].map(obj => `${obj}: tasks(order_by: {root_order: desc}, where: {status: {_eq: "${obj}"}
            ${project.length > 0 ? `, project_id: {_eq: "${project}"}` : ``}
            ${hiddenProject.length > 0 ? `, project_id: {_neq: "${hiddenProject}"}` : ``}
            ${search.length > 0 ? `, details: {_ilike: "%${search}%"}` : ``}
            ${priority.length > 0 ? `, priority: {_eq: "${priority}"}` : ``}
        }) {
              id
              created_at
              date
              time
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

    const saveTasks = async (newTasks, task) => {
        if (newTasks) {
            console.log(tasks.done.filter(obj => obj.id === task.id));
            if (task.status === 'done') {
                setConfetti(true); setTimeout(() => { setConfetti(false) }, 2500);
            }
            //save the order of all tasks
            await API.graphql(graphqlOperation(`mutation {
                ${task.id ? `saveTask: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {status: "${task.status}"}) {id}` : ''}
                ${['backlog', 'selected', 'in_progress', 'done'].map(
                status => newTasks[status].map((task, taskIndex) => `saveTasks${status}${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {root_order: ${newTasks[status].length - taskIndex - 1}}) {id}`).join(', ')
            ).join(',')}}`));
        }
    }

    return (
        <div style={{ width: '100%', paddingTop: projectScreen ? 0 : 50, marginLeft: 'auto', marginRight: 'auto', height: '100%' }}>
            {!projectScreen &&
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', color: '#fff', fontFamily: 'arial', marginBottom: 10, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
                    <div style={{ width: '25%', marginLeft: 5, marginRight: 5 }}>
                        <InputComponent type={'select'} value={project} setValue={(value) => { setProject(value) }} options={[{ id: '', name: 'show all projects', image: null }, ...projects]} optionImage={true} width={'100%'} fontSize={14} />
                    </div>
                    <div style={{ width: '25%', marginLeft: 5, marginRight: 5 }}>
                        <InputComponent type={'select'} value={hiddenProject} setValue={(value) => { setHiddenProject(value) }} options={[{ id: '', name: 'hide no projects', image: null }, ...projects]} optionImage={true} width={'100%'} fontSize={14} />
                    </div>
                    <div style={{ width: '25%', marginLeft: 5, marginRight: 5 }}>
                        <InputComponent type={'select'} value={priority} setValue={(value) => { setPriority(value) }} options={[{ id: '', name: 'show all priorities' }, { id: 'low', name: 'low priority' }, { id: 'medium', name: 'medium priority' }, { id: 'high', name: 'high priority' }]} optionCharacterImage={false} width={'100%'} fontSize={14} />
                    </div>
                    <div style={{ width: '25%', marginLeft: 5, marginRight: 5 }}>
                        <input placeholder="search" style={{ width: '100%', fontSize: 14, padding: 6, backgroundColor: colors.background, color: colors.text, borderRadius: 10, borderStyle: 'solid', borderWidth: 1 }} onChange={(e) => { setSearch(e.target.value) }} />
                    </div>
                </div>}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', color: '#ccc', fontFamily: 'arial', marginBottom: 10, fontSize: 14 }}>
                {[{ key: 'backlog', label: 'backlog', icon: '◔', leftDistance: 10 }, { key: 'selected', label: 'selected', icon: '◑', leftDistance: (showContainers.backlog && showContainers.in_progress && showContainers.done) ? '33%' : (showContainers.backlog && showContainers.in_progress || showContainers.backlog && showContainers.done) ? '50%' : 40 }, { key: 'in_progress', label: 'in progress', icon: '◕', rightDistance: (showContainers.backlog && showContainers.selected && showContainers.done) ? '33%' : (showContainers.selected && showContainers.done || showContainers.backlog && showContainers.done) ? '50%' : 40 }, { key: 'done', label: 'done', icon: '⬤', rightDistance: 10 }].map(({ key, label, icon, leftDistance, rightDistance }) =>
                    showContainers[key] ?
                        <div style={{ color: colors.subtitle }}><span onClick={() => { setShowContainers({ ...showContainers, [key]: !showContainers[key] }) }} style={{ cursor: 'pointer' }}>{icon}</span> {label} ({tasks[key].length}) <span onClick={() => { navigation.push('edit_task', { status: key, project_id: project }) }} style={{ cursor: 'pointer', backgroundColor: '#0075ff', borderRadius: 5, padding: '2px 5px', color: '#ffffff', marginLeft: 5 }}>add +</span></div>
                        :
                        <div onClick={() => { setShowContainers({ ...showContainers, [key]: !showContainers[key] }) }} style={{ color: colors.subtitle, cursor: 'pointer', position: 'absolute', ...(leftDistance && { left: leftDistance }), ...(rightDistance && { right: rightDistance }) }}>{icon}</div>
                )}
            </div>
            <MultipleContainers activationConstraint={{ distance: 1 }} scrollable items={tasks} setItems={setTasks} saveTasks={saveTasks} heightOffset={projectScreen ? 220 : 130} onRefresh={onRefresh} showContainers={showContainers} setContextPosition={setContextPosition} />
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y - (projectScreen ? 180 : 0), left: contextPosition.x - (projectScreen ? 10 : 0) } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    {contextPosition.rename && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.rename();
                    }} ><Text style={{ color: colors.text }}>Edit</Text></TouchableOpacity>}
                    {contextPosition.delete && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.delete();
                    }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>}
                    <TouchableOpacity style={{ padding: 5, width: '100%' }}
                        onPress={() => { menuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
                </MenuOptions>
            </Menu>
            {confetti && <ConfettiCannon count={50} origin={{ x: windowDimensions.width / 2, y: -15 }} autoStart={true} fadeOut={true} explosionSpeed={350} fallSpeed={2000} />}
        </div>
    );
}