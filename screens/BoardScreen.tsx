import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, useWindowDimensions, FlatList, ActionSheetIOS, Pressable } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as Haptics from 'expo-haptics';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';

let mainDragRefTimeout: any;
let dragRefTimeouts = [null, null, null, null, null, null, null, null];
let touchX: any;
export default function BoardScreen({ route, navigation, refresh, setLoading }: any) {
    const window = useWindowDimensions();
    const [update, setUpdate] = useState(true);
    const [kanban, setKanban] = useState({ kanban_columns: [] });
    const [layoutKey, setLayoutKey] = useState((new Date).toString());
    const mainDragRef = useRef(null);
    const dragRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
    const [lik, setLik] = useState(`${0}`);
    const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, delete: () => { } });
    const menuRef = useRef(null);
    const modalRef = useRef(null);
    const [modal, setModal] = useState({});
    const updateLik = () => {
        setLik(`${lik + 1}`);
    }
    const [index, setIndex] = useState(0);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh, route.params])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            kanban_projects_by_pk(id: "${route.params.id}") {
                id
              name
              description
              project {
                  key
                  id
              }
              kanban_columns(order_by: {order: asc}) {
                id
                name
                kanban_items(order_by: {order: asc}) {
                  id
                  name
                  key
                  hidden
                }
              }
            }
          }`));
        setKanban(data.data.kanban_projects_by_pk);
        setLoading(false);
    }

    useEffect(() => {
        updateKanban();
    }, [kanban]);

    let updateKanban = async () => {
        if (kanban.kanban_columns.length > 0 && update) {
            let response = await API.graphql(graphqlOperation(`mutation {
            ${kanban.kanban_columns.map((column, columnIndex) => `column${columnIndex}: update_kanban_columns_by_pk(pk_columns: {id: "${column.id}"}, _set: {order: ${columnIndex}}) {id}
                ${column.kanban_items.map((item, itemIndex) => `column${columnIndex}item${itemIndex}: update_kanban_items_by_pk(pk_columns: {id: "${item.id}"}, _set: {order: ${itemIndex}, name: "${item.name.replace(/[\r\n]/g, "\\n").replace(/"/g, `\\"`)}", hidden: ${item.hidden ? 'true' : 'false'}, kanban_column_id: "${column.id}"}) {id}`)}
            `)}
            }`));
        }
        else {
            setUpdate(true);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { width: '100%', height: '100%' }]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: root.desktopWeb ? 50 : 10, marginBottom: root.desktopWeb ? 0 : -20, zIndex: 10, position: 'relative', width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : '100%', paddingLeft: 30, paddingRight: 30 }}>
                <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ marginRight: 10 }} onPress={async () => {
                    navigation.navigate('project', { id: kanban.project.id })
                }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                <View style={{ flexDirection: 'column', alignItems: 'center', width: '80%' }}>
                    <TextInput spellCheck={false}
                        value={kanban.name}
                        onChangeText={(value) => {
                            setUpdate(false);
                            setKanban({ ...kanban, name: value });
                        }}
                        onBlur={async () => {
                            await API.graphql(graphqlOperation(`mutation {update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {name: "${kanban.name}"}) {id}}`));
                        }}
                        style={[{ color: '#ffffff', textAlign: 'center', width: '100%', fontWeight: 'bold' }, root.desktopWeb && { outlineWidth: 0 }]}
                    />
                    <TextInput spellCheck={false}
                        multiline={true}
                        value={kanban.description}
                        onChangeText={(value) => {
                            setUpdate(false);
                            setKanban({ ...kanban, description: value });
                        }}
                        onBlur={async () => {
                            await API.graphql(graphqlOperation(`mutation {update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {description: "${kanban.description}"}) {id}}`));
                        }}
                        style={[{ color: '#ffffff', textAlign: 'center', width: '100%' }, root.desktopWeb && { outlineWidth: 0 }]}
                    />
                </View>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 10, fontSize: 30 }} onPress={async () => {
                    async function deleteItem() {
                        setLoading(true);
                        await API.graphql(graphqlOperation(`mutation {
                            delete_kanban_projects_by_pk(id: "${kanban.id}") {
                            id
                            }
                        }
                        `));
                        setLoading(false);
                        navigation.navigate('project', { id: kanban.project.id })
                    }
                    if (Platform.OS === 'ios') {
                        ActionSheetIOS.showActionSheetWithOptions(
                            {
                                options: ['Cancel', 'Delete'],
                                cancelButtonIndex: 0,
                                destructiveButtonIndex: 1
                            },
                            buttonIndex => {
                                if (buttonIndex !== 0) {
                                    deleteItem();
                                }
                            }
                        )
                    }
                    else {
                        if (confirm('Are you sure you want to delete this board?')) { deleteItem(); }
                    }
                }}><Text>...</Text></TouchableOpacity>
            </View>
            <FlatList
                scrollEnabled={false}
                onTouchStart={e => { touchX = e.nativeEvent.pageX }}
                onTouchMove={e => {
                    if (touchX) {
                        if (touchX - e.nativeEvent.pageX > 10 && index < 2) {
                            mainDragRef.current.scrollToIndex({ index: index + 1 }); setIndex(index + 1);
                        }
                        else if (touchX - e.nativeEvent.pageX < -5 && index > 0) {
                            mainDragRef.current.scrollToIndex({ index: index - 1 }); setIndex(index - 1);
                        }
                    }
                }}
                ref={mainDragRef}
                autoscrollSpeed={200}
                layoutInvalidationKey={lik}
                pagingEnabled={true}
                horizontal={true}
                containerStyle={[{ width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : window.width - 10, paddingTop: root.desktopWeb ? 0 : 10 }]}
                data={kanban.kanban_columns}
                renderItem={(columnParams) => {
                    return (
                        <View style={{ flexDirection: 'column', width: root.desktopWeb ? (Math.min(window.width, root.desktopWidth) / kanban.kanban_columns.length) : window.width - 10, height: root.desktopWeb ? window.height - 86 : '100%', padding: root.desktopWeb ? 2 : 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, paddingBottom: 0 }}>
                                <TouchableOpacity delayLongPress={200} onLongPress={columnParams.drag} style={{ cursor: 'grab' }} onPressIn={() => { if (Platform.OS === 'web') { updateLik(); mainDragRef.current.flushQueue(); clearTimeout(mainDragRefTimeout); } }}
                                    onPressOut={() => { if (Platform.OS === 'web') { mainDragRef.current.flushQueue(); clearTimeout(mainDragRefTimeout); mainDragRefTimeout = setTimeout(() => { mainDragRef.current.resetHoverState(); }, 750); } }}
                                    disabled={columnParams.isActive} >
                                    <Text>{columnParams.item.name}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} onPress={async () => {
                                    let count = await API.graphql(graphqlOperation(`{
                                        kanban_items_aggregate(where: {kanban_column_id: {_in: [${kanban.kanban_columns.map(obj => `"${obj.id}"`).join(',')}]}}) {
                                            aggregate {
                                                max {
                                                    key
                                                }
                                            }
                                        }
                                    }`));
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                        insert_kanban_items_one(object: {kanban_column_id: "${columnParams.item.id}", name: "", order: ${columnParams.item.kanban_items.length}, key: ${count.data.kanban_items_aggregate.aggregate.max.key + 1}}) {
                                          id
                                        }
                                      }`));
                                    let newKanbanColumns = kanban.kanban_columns;
                                    newKanbanColumns[columnParams.index].kanban_items.push({ id: data.data.insert_kanban_items_one.id, kanban_column_id: columnParams.item.id, name: '', key: count.data.kanban_items_aggregate.aggregate.max.key + 1 });
                                    setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                }}>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <DraggableFlatList
                                dragFreely={true}
                                onScroll={e => { touchX = false }}
                                scrollEnabled={true}
                                layoutInvalidationKey={lik}
                                containerStyle={{ height: '100%' }}
                                data={columnParams.item.kanban_items}
                                ref={dragRefs[columnParams.index]}
                                renderItem={(item) => {
                                    return (
                                        <Pressable
                                            onPress={async (e) => {
                                                navigation.navigate('item', { id: item.item.id });
                                                // setModal({ ...item.item, columnIndex: columnParams.index, itemIndex: item.index });
                                                // modalRef.current.open();
                                            }}
                                            onContextMenu={async (e: any) => {
                                                e.preventDefault();
                                                setContextPosition({
                                                    x: e.nativeEvent.pageX, y: e.nativeEvent.pageY,
                                                    delete: async () => {
                                                        await API.graphql(graphqlOperation(`mutation {delete_kanban_items_by_pk(id: "${item.item.id}") {id}}`));
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }
                                                });
                                                setTimeout(() => { menuRef.current.open() }, 0);
                                            }}
                                            onPressIn={(e) => {
                                                if (Platform.OS === 'web') { updateLik(); dragRefs[columnParams.index].current && dragRefs[columnParams.index].current.flushQueue(); clearTimeout(dragRefTimeouts[columnParams.index]); }
                                                // setTimeout(() => {
                                                //     dragRefs[columnParams.index].current.resetHoverState();
                                                //     let newKanbanColumns = kanban.kanban_columns;
                                                //     newKanbanColumns[columnParams.index + 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1)[0]);
                                                //     setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                //     const key = `draggable-item-${item.item.id}`;
                                                //     const cellRef = dragRefs[columnParams.index + 1].current.cellRefs.get(key);
                                                //     // console.log(dragRefs[columnParams.index + 1].current.flatlistRef.current);
                                                //     const hoverComponent = dragRefs[columnParams.index + 1].current.renderItem({ isActive: false, item: item.item, index: newKanbanColumns[columnParams.index + 1].kanban_items.length - 1 });
                                                //     console.log(hoverComponent);
                                                //     hoverComponent.drag();
                                                //     // dragRefs[columnParams.index + 1].current.drag(hoverComponent, key);
                                                // }, 500)
                                            }}
                                            onPressOut={(e) => {
                                                if (Platform.OS === 'web') {
                                                    dragRefs[columnParams.index].current && dragRefs[columnParams.index].current.flushQueue(); clearTimeout(dragRefTimeouts[columnParams.index]); dragRefTimeouts[columnParams.index] = setTimeout(() => { dragRefs[columnParams.index].current && dragRefs[columnParams.index].current.resetHoverState(); }, 750);
                                                    if (columnParams.index < 3 && e.nativeEvent.locationX > (Platform.OS === 'web' ? (Math.min(window.width, root.desktopWidth) / 3) : window.width - 20)) {
                                                        dragRefs[columnParams.index].current.resetHoverState();
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index + 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1)[0]);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }
                                                    else if (columnParams.index > 0 && e.nativeEvent.locationX < (Platform.OS === 'web' ? 0 : 20)) {
                                                        dragRefs[columnParams.index].current.resetHoverState();
                                                        let newKanbanColumns = kanban.kanban_columns;
                                                        newKanbanColumns[columnParams.index - 1].kanban_items.push(newKanbanColumns[columnParams.index].kanban_items.splice(item.index, 1)[0]);
                                                        setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                                    }
                                                }
                                            }}
                                            disabled={item.isActive}
                                            delayLongPress={100}
                                            onLongPress={item.drag}
                                            style={{
                                                margin: 5,
                                                height: 'auto',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                borderColor: '#444444',
                                                borderWidth: 1,
                                                backgroundColor: item.isActive ? '#333333' : '#161616',
                                                paddingBottom: 1,
                                                borderRadius: 10,
                                                cursor: 'grab',
                                            }}>
                                            {!item.item.hidden && <Text style={[{ color: '#ffffff', fontSize: 14, width: '100%', padding: 5 }]}>• {item.item.name}</Text>}
                                        </Pressable>
                                    )
                                }}
                                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                                activationDistance={0}
                                dragItemOverflow={true}
                                onDragBegin={(e) => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); touchX = false; }}
                                onTouchEnd={(e) => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                onDragEnd={({ data }) => {
                                    let newKanbanColumns = kanban.kanban_columns;
                                    newKanbanColumns[columnParams.index].kanban_items = data;
                                    setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                    setLayoutKey(new Date().toString());
                                }}
                            />
                        </View>
                    )
                }}
                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                activationDistance={0}
                dragItemOverflow={true}
                onDragBegin={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
                onDragEnd={({ data }) => {
                    Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setKanban({ ...kanban, kanban_columns: data });
                    setLayoutKey(new Date().toString());
                }}
            />
            <InputAccessoryViewComponent />
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
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
            <Menu style={{ position: 'absolute', top: Platform.OS === 'web' ? 'calc(20% - 75px)' : '20%', left: Platform.OS === 'web' ? '25%' : '5%' }} ref={modalRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: 0, left: 0 } }} />
                <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: 'transparent', width: '100%', height: '100%' }, optionsContainer: { width: Platform.OS === 'web' ? '50%' : '90%', height: Platform.OS === 'web' ? '60%' : '60%' } }}>
                    {modal.key &&
                        <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#000000', borderColor: '#444444', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}>
                            <Text>{kanban.project.key} • {kanban.name} #{modal.key}</Text>
                            <TextInput spellCheck={false} multiline={true} textAlignVertical={'top'} style={[{ color: '#ffffff', fontSize: 14, width: '100%', padding: 5, height: '100%' }]} value={kanban.kanban_columns[modal.columnIndex].kanban_items[modal.itemIndex].name}
                                inputAccessoryViewID='main'
                                onChangeText={(value) => {
                                    let newKanbanColumns = kanban.kanban_columns;
                                    newKanbanColumns[modal.columnIndex].kanban_items[modal.itemIndex].name = value;
                                    setUpdate(false);
                                    setKanban({ ...kanban, kanban_columns: newKanbanColumns });
                                }}
                                onBlur={async () => {
                                    setUpdate(true);
                                    setKanban({ ...kanban });
                                }}
                            />
                        </View>
                    }
                </MenuOptions>
            </Menu>
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center'
    },
});
