import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput, Platform, Keyboard, Alert, useWindowDimensions, Image, ActivityIndicator } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import * as root from '../Root';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

export default function TaskScreen({ route, navigation, refresh, setLoading, loading }: any) {
    const windowDimensions = useWindowDimensions();
    const [refreshControl, setRefreshControl] = useState(false);
    const [count, setCount] = useState(0);
    const [task, setTask] = useState({});
    const { colors } = useTheme();
    const styles = makeStyles(colors);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh, route.params])
    );

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        //load existing task if editing
        let task = {};
        let data = await API.graphql(graphqlOperation(`{
            tasks_by_pk(id: "${route.params.id}") {
                id
                created_at
                project_id
                project {
                    image
                }
                date
                category
                details
                comments(order_by: {created_at: asc}) {
                    id
                    created_at
                    updated_at
                    details
                }
                comments_aggregate {
                    aggregate {
                      count
                    }
                }
            }
        }`));
        setTask(data.data.tasks_by_pk);
        setCount(data.data.tasks_by_pk.comments_aggregate.aggregate.count);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Platform.OS === 'web' ? 50 : 0, }}>
            <View style={{ width: Math.min(850, windowDimensions.width), height: windowDimensions.height - (Platform.OS === 'web' ? 80 : 100) }}>
                {root.desktopWeb ?
                    <TouchableOpacity style={{ alignSelf: 'flex-start', marginLeft: -40, marginBottom: -60 }} onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    :
                    <View style={{ padding: 10, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <TouchableOpacity onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                        <Text>{'task'}</Text>
                        <Text style={{ fontSize: 30, opacity: 0 }}>←</Text>
                    </View>}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, margin: 10, marginBottom: 0, borderRadius: 10, backgroundColor: colors.card }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: Platform.OS === 'web' ? 'calc(100% - 100px)' : '70%' }}>
                        <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                            <Image style={{ height: 30, width: 30, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${task.project?.image}` }} />
                        </View>
                        <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                            <Text style={{ color: colors.subtitle, fontSize: 10, textAlign: 'left' }}>{task.created_at ? new Date(task.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : ' '}</Text>
                            <Text style={{ textDecorationLine: task.status === 'done' ? 'line-through' : 'none', fontSize: Platform.OS === 'web' ? 14 : 14 }}>{task.details ? task.details : ' '}</Text>
                            <Text style={{ fontSize: 10, color: colors.subtitle }}>{task?.comments_aggregate?.aggregate?.count} comments{task.category ? `, #${task.category}` : ``}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => { navigation.push('edit_task', { id: task.id }) }}
                        style={{ width: 50, height: 30, borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 5, backgroundColor: '#0075ff' }}>
                        <Text style={{ color: '#ffffff' }}>edit</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    style={{ width: '100%', height: 200, paddingLeft: 10 }}
                    numColumns={1}
                    data={task?.comments}
                    contentContainerStyle={{ width: '100%' }}
                    renderItem={({ item, index }) => (
                        <View
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, margin: 10, marginBottom: 0, borderRadius: 10, backgroundColor: colors.card }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', maxWidth: '100%' }}>
                                <TouchableOpacity
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    onLongPress={async () => {
                                        const deleteFunction = async () => {
                                            await API.graphql(graphqlOperation(`mutation {delete_comments_by_pk(id: "${item.id}") {id}}`));
                                            await onRefresh(true);
                                        }
                                        if (Platform.OS !== 'web') {
                                            Alert.alert('Warning', 'Are you sure you want to delete this comment?',
                                                [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                        }
                                        else if (confirm('Are you sure you want to delete this comment?')) { await deleteFunction() }
                                    }} style={{ height: 30, width: 2, backgroundColor: colors.subtitle, marginLeft: 0, marginRight: 10 }} />
                                <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                                    <Text style={{ color: colors.subtitle, fontSize: 10, textAlign: 'left' }}>{item.created_at ? new Date(item.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : ' '}</Text>
                                    <Text style={{ textDecorationLine: task.status === 'done' ? 'line-through' : 'none', fontSize: Platform.OS === 'web' ? 14 : 14 }}>{item.details}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    keyExtractor={item => item}
                    ListFooterComponent={() =>
                        <>
                            {task?.id && <TextInput placeholderTextColor={colors.placeholder}
                                style={{ color: colors.text, padding: 5, margin: 15, borderBottomColor: colors.subtitle, borderBottomWidth: 1 }}
                                placeholder="add a comment"
                                returnKeyType='send'
                                type='text'
                                onSubmitEditing={async (e) => {
                                    let content = e.nativeEvent.text;
                                    let newComment = await API.graphql(graphqlOperation(`mutation($task_id: uuid, $details: String) {
                                        insert_comments_one(object: {parent_id: $task_id, details: $details }) {id created_at}
                                    }`, { task_id: task.id, details: content }));
                                    setTask({ ...task, comments: [...task.comments, { id: newComment.data.insert_comments_one.id, created_at: newComment.data.insert_comments_one.created_at, details: content }] })
                                    await onRefresh(true);
                                }}
                            />}
                        </>
                    }
                    onEndReached={() => { }}
                    ListEmptyComponent={<View />}
                />
                <InputAccessoryViewComponent />
            </View>
        </View>
    );
}

const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.6) {
    return isWeb ? number * factor : number;
}
const makeStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: colors.text
    },
    touchableOpacity: {
        backgroundColor: '#3F0054',
        padding: s(10),
        width: 275,
        alignItems: 'center',
        margin: s(10),
        borderRadius: 10
    },
    buttonText: {
        fontSize: s(30)
    },
    textInput: { backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: '100%', borderRadius: 10 },
    picker: { backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, paddingLeft: 35 }
});
