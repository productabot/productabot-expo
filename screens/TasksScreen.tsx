import * as React from 'react';
import { Text } from '../components/Themed';
import { View, RefreshControl, Platform, useWindowDimensions, Image, Alert, TouchableOpacity } from 'react-native';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import { useFocusEffect } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import * as root from '../Root';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';

const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 2);
export default function TasksScreen({ refresh, setLoading, loading, navigation }: any) {
    const [refreshControl, setRefreshControl] = React.useState(false);
    const [index, setIndex] = React.useState(1);
    const [checked, setChecked] = React.useState([]);
    const [count, setCount] = React.useState({ backlog: 0, in_progress: 0, done: 0 });
    const [tasks, setTasks] = React.useState([]);
    const windowDimensions = useWindowDimensions();
    const [contextPosition, setContextPosition] = React.useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const menuRef = React.useRef(null);
    const [confetti, setConfetti] = React.useState(false);

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [index])
    );

    React.useEffect(() => {
        onRefresh();
    }, [refresh, index]);

    let onRefresh = async (showRefreshControl = false) => {
        setChecked([]);
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        let tasksData = await API.graphql(graphqlOperation(`{
            tasks(order_by: {root_order: desc}, where: {status: {_eq: "${index === 0 ? 'backlog' : index === 1 ? 'in_progress' : 'done'}"}}) {
              id
              created_at
              category
              details
              status
              root_order
              project {
                  image
                  color
              }
              comments_aggregate {
                  aggregate {
                    count
                  }
              }
            }
            backlog: tasks_aggregate(where: {status: {_eq: "backlog"}}) {
                aggregate {
                count
                }
            }
            in_progress: tasks_aggregate(where: {status: {_eq: "in_progress"}}) {
                aggregate {
                count
                }
            }
            done: tasks_aggregate(where: {status: {_eq: "done"}}) {
                aggregate {
                count
                }
            }
          }`));
        setTasks(tasksData.data.tasks);
        setCount({ backlog: tasksData.data.backlog.aggregate.count, in_progress: tasksData.data.in_progress.aggregate.count, done: tasksData.data.done.aggregate.count })
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }


    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Platform.OS === 'web' ? 50 : 0, }}>
            <View style={{ width: Math.min(600, windowDimensions.width), height: windowDimensions.height - (Platform.OS === 'web' ? 60 : 150) }}>
                <SegmentedControl
                    appearance='dark'
                    style={{ width: '100%', marginTop: 10, marginBottom: 10 }}
                    values={[`backlog (${count.backlog})`, `in progress (${count.in_progress})`, `done (${count.done})`]}
                    selectedIndex={index}
                    onChange={(e) => { setChecked([]); setIndex(e.nativeEvent.selectedSegmentIndex); Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                />
                <View style={{ width: '100%', height: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
                    {(checked.length > 0 && index !== 0) ? <TouchableOpacity
                        style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                        onPress={async () => {
                            Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            await API.graphql(graphqlOperation(`mutation {${checked.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task}"}, _set: {status: "${index === 1 ? 'backlog' : index === 2 ? 'in_progress' : 'done'}", root_order: 10000}) {id}`)}}`));
                            await onRefresh();
                        }}><Text>{`move to `}<Text style={{ fontWeight: 'bold' }}>{index === 1 ? 'backlog' : index === 2 ? 'in progress' : 'done'}</Text></Text></TouchableOpacity> : <Text>{``}</Text>}
                    {checked.length !== 0 &&
                        <View style={{ alignSelf: 'center', backgroundColor: '#000000', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}><Text>{`${checked.length} selected`}</Text></View>
                    }
                    {(checked.length > 0 && index !== 2) ? <TouchableOpacity
                        style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                        onPress={async () => {
                            await API.graphql(graphqlOperation(`mutation {${checked.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task}"}, _set: {status: "${index === 0 ? 'in_progress' : index === 1 ? 'done' : 'backlog'}", root_order: 10000}) {id}`)}}`));
                            await onRefresh();
                            if (index === 1) {
                                Platform.OS !== 'web' && [...Array(25).keys()].map(i => setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, i * 25));
                                setConfetti(true); setTimeout(() => { setConfetti(false) }, 2500);
                            }
                        }}><Text>{`move to `}<Text style={{ fontWeight: 'bold' }}>{index === 0 ? 'in progress' : index === 1 ? 'done' : 'backlog'}</Text></Text></TouchableOpacity> : <Text>{``}</Text>}
                    {checked.length === 0 &&
                        <TouchableOpacity
                            style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 10, paddingRight: 10, borderRadius: 10 }}
                            onPress={async () => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); navigation.navigate('edit_task', { status: index === 0 ? 'backlog' : index === 1 ? 'in_progress' : 'done' }) }}><Text>{`add task +`}</Text></TouchableOpacity>
                    }
                </View>
                <CustomDraggableFlatList
                    noBorder={true}
                    data={tasks}
                    renderItem={({ item, itemIndex }) =>
                        <>
                            {(!loading && index === 0 && item.root_order === 10000) && <View style={{ position: 'absolute', left: -7, top: -7, backgroundColor: '#3f91a1', borderRadius: 5, paddingLeft: 5, paddingRight: 5 }}><Text style={{ fontSize: 14 }}>new</Text></View>}
                            {(!loading && index === 1 && new Date(item.created_at) < oldDate) && <View style={{ position: 'absolute', left: -7, top: -7, backgroundColor: (new Date(new Date().getTime() - new Date(item.created_at).getTime()).getDate() < 7) ? '#3F0054' : '#ff0000', borderRadius: 5, paddingLeft: 5, paddingRight: 5 }}><Text style={{ fontSize: 14 }}>{new Date(new Date().getTime() - new Date(item.created_at).getTime()).getDate()} days old</Text></View>}
                            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -5, marginBottom: -5 }}>
                                <TouchableOpacity onPress={() => {
                                    Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    navigation.navigate('task', { id: item.id });
                                }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '75%' }}>
                                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                                        <Image style={{ height: 30, width: 30, borderRadius: 5, borderColor: '#ffffff', borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${item.project.image}` }} />
                                    </View>
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                                        <Text style={{ color: '#aaaaaa', fontSize: 10, textAlign: 'left', marginTop: 5 }}>{new Date(item.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                                        <Text style={{ textDecorationLine: item.status === 'done' ? 'line-through' : 'none', fontSize: Platform.OS === 'web' ? 14 : 14 }}>{item.details}</Text>
                                        <Text style={{ fontSize: 10, color: '#aaaaaa' }}>{item.comments_aggregate.aggregate.count} comments{item.category ? `, #${item.category}` : ``}</Text>
                                    </View>
                                </TouchableOpacity>
                                <View onStartShouldSetResponder={() => true}>
                                    {Platform.OS === 'web' ?
                                        <input
                                            checked={checked.filter(obj => obj === item.id).length > 0 ? true : false}
                                            style={{ width: 30, height: 30 }}
                                            onChange={(e) => {
                                                if (e.target.checked === true) {
                                                    setChecked([...checked, item.id]);
                                                }
                                                else {
                                                    setChecked(checked.filter(obj => obj !== item.id));
                                                }
                                                setTasks(tasks);
                                            }}
                                            type="checkbox" />
                                        :
                                        <TouchableOpacity
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (checked.filter(obj => obj === item.id).length === 0) {
                                                    setChecked([...checked, item.id]);
                                                }
                                                else {
                                                    setChecked(checked.filter(obj => obj !== item.id));
                                                }
                                            }}
                                            style={{ width: 30, height: 30, borderRadius: 5, borderWidth: checked.filter(obj => obj === item.id).length > 0 ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 5, backgroundColor: checked.filter(obj => obj === item.id).length > 0 ? '#0075ff' : '#ffffff' }}>
                                            {checked.filter(obj => obj === item.id).length > 0 && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 30 }}>✓</Text>}
                                        </TouchableOpacity>
                                    }
                                </View>
                            </View>
                        </>
                    }
                    onRename={async (item) => {
                        const renameFunction = async (rename) => {
                            setLoading(true);
                            if (rename) {
                                await API.graphql(graphqlOperation(`mutation{update_tasks_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {details: "${rename}"}) {id}}`));
                            }
                            await onRefresh();
                            setLoading(false);
                        }
                        if (Platform.OS !== 'web') {
                            Alert.prompt('Rename', '', async (text) => {
                                await renameFunction(text);
                            }, 'plain-text', item.item.details);
                        }
                        else {
                            let rename = prompt('Rename', item.item.details);
                            await renameFunction(rename);
                        }
                    }}
                    onDelete={async (item) => {
                        const deleteFunction = async () => {
                            setLoading(true);
                            await API.graphql(graphqlOperation(`mutation {delete_tasks_by_pk(id: "${item.id}") {id}}`));
                            await onRefresh();
                            setLoading(false);
                        }
                        if (Platform.OS !== 'web') {
                            Alert.alert('Warning', 'Are you sure you want to delete this task?',
                                [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                        }
                        else if (confirm('Are you sure you want to delete this task?')) { await deleteFunction() }
                    }}
                    setContextPosition={setContextPosition}
                    menuRef={menuRef}
                    onPress={async ({ item, index }) => { }}
                    onDragEnd={async ({ data }) => {
                        setTasks(data);
                        await API.graphql(graphqlOperation(`mutation {${data.map((task, taskIndex) => `data${taskIndex}: update_tasks_by_pk(pk_columns: {id: "${task.id}"}, _set: {root_order: ${data.length - taskIndex - 1}}) {id}`)}}`));
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshControl}
                            onRefresh={() => { onRefresh(true) }}
                            colors={["#ffffff"]}
                            tintColor='#ffffff'
                            titleColor="#ffffff"
                            title=""
                        />}
                />
            </View>
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y - 40, left: contextPosition.x } }} />
                <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: '#000000', borderColor: '#444444', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        {contextPosition.rename && <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
                            menuRef.current.close();
                            await contextPosition.rename();
                            await onRefresh();
                        }} ><Text>Rename</Text></TouchableOpacity>}
                        {contextPosition.delete && <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
                            menuRef.current.close();
                            await contextPosition.delete();
                            await onRefresh();
                        }}><Text>Delete</Text></TouchableOpacity>}
                        <TouchableOpacity style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 20, width: '100%' }}
                            onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
                    </View>
                </MenuOptions>
            </Menu>
            {confetti && <ConfettiCannon count={100} origin={{ x: windowDimensions.width / 2, y: -15 }} autoStart={true} fadeOut={true} explosionSpeed={350} fallSpeed={2000} />}
        </View >
    );
}