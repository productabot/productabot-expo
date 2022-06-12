import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, useWindowDimensions, Text, Image } from 'react-native';
import { View } from '../components/Themed';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import Timeline, { TimelineHeaders, DateHeader, CursorMarker, CustomMarker } from 'react-calendar-timeline'
import './Timeline.css'
import moment from 'moment';
import { API, graphqlOperation } from "@aws-amplify/api";
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';

const labelFormat = {
    year: {
        long: 'YYYY',
        mediumLong: 'YYYY',
        medium: 'YYYY',
        short: 'YY'
    },
    month: {
        long: 'MMMM',
        mediumLong: 'MMMM',
        medium: 'MMM',
        short: 'M'
    },
    week: {
        long: 'w',
        mediumLong: 'w',
        medium: 'w',
        short: 'w'
    },
    day: {
        long: 'dddd D',
        mediumLong: 'dd D',
        medium: 'D',
        short: 'D'
    }
}

let dragging = false;

export default function TimelinesScreen({ route, navigation, setLoading }: any) {
    const { colors } = useTheme();
    const [hideScreen, setHideScreen] = useState(true);
    const [groups, setGroups] = useState([...Array(20).keys()].map(obj => { return { id: obj } }));
    const [items, setItems] = useState([]);
    const [contextPosition, setContextPosition] = React.useState({ x: 0, y: 0, rename: () => { }, edit: () => { }, delete: () => { } });
    const menuRef = React.useRef(null);

    const onRefresh = async () => {
        let data = await API.graphql(graphqlOperation(`{
        timelines(order_by: {created_at: asc}) {
          id
          group: project_id
          start_time: date_from
          end_time: date_to
          title: details
        }
      }
      `));
        const newItems = data.data.timelines.map(obj => { return { ...obj, start_time: moment(obj.start_time), end_time: moment(obj.end_time) } });
        setItems(newItems);
        setTimeout(() => { setItems([...newItems]) }, 1);
    }

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            setHideScreen(false);
            onRefresh();
            return () => { setHideScreen(true) }
        }, [route.params])
    );

    useEffect(() => {
        const async = async () => {
            let data = await API.graphql(graphqlOperation(`{
                projects(order_by: {order: asc}, where: {archived: {_eq: false}}) {
                  id
                  name
                  image
                }
              }
              `));
            setGroups(data.data.projects);
        }
        async();
    }, []);

    useEffect(() => {
        if (contextPosition.x > 0 && contextPosition.y > 0) { menuRef.current.open(); }
    }, [contextPosition]);

    return (
        <div style={{ width: '100%', height: '100%', paddingTop: 50 }}>
            {!hideScreen &&
                <Timeline
                    style={{ color: colors.text }}
                    groups={groups}
                    items={items}
                    defaultTimeStart={moment().startOf('month')}
                    defaultTimeEnd={moment().startOf('month').add(6, 'months')}
                    minZoom={60 * 60 * 24 * 1000 * 7}
                    dragSnap={60 * 60 * 24 * 1000}
                    timeSteps={{
                        day: 1,
                        month: 1,
                        year: 1
                    }}
                    selected={items.map(obj => obj.id)}
                    canResize={'both'}
                    lineHeight={60}
                    stackItems={true}
                    onItemMove={async (itemId, dragTime, newGroupOrder) => {
                        const newGroupOrderId = groups[newGroupOrder].id;
                        const originalItem = items.filter(obj => obj.id === itemId)[0];
                        const oldDateFrom = moment(originalItem.start_time);
                        const newDateFrom = moment(dragTime);
                        const difference = oldDateFrom.diff(newDateFrom, 'days');
                        const newDateTo = moment(originalItem.end_time).subtract(difference, 'days');
                        let newItems = [...items];
                        const index = newItems.findIndex(obj => obj.id === itemId);
                        newItems[index] = { ...originalItem, start_time: moment(dragTime), end_time: newDateTo, group: newGroupOrderId };
                        setItems(newItems);
                        await API.graphql(graphqlOperation(`mutation {
                            update_timelines_by_pk(pk_columns: {id: "${itemId}"}, _set: {date_from: "${newDateFrom.format("YYYY-MM-DD")}", date_to: "${newDateTo.format("YYYY-MM-DD")}", project_id: "${newGroupOrderId}"}) {
                              id
                            }
                          }`));
                        onRefresh();
                        dragging = false;
                    }}
                    onItemResize={async (itemId, time, edge) => {
                        const originalItem = items.filter(obj => obj.id === itemId)[0];
                        let newItems = [...items];
                        const index = newItems.findIndex(obj => obj.id === itemId);
                        newItems[index] = { ...originalItem, [edge === 'left' ? 'start_time' : 'end_time']: moment(time) };
                        setItems(newItems);
                        await API.graphql(graphqlOperation(`mutation {
                            update_timelines_by_pk(pk_columns: {id: "${itemId}"}, _set: {${edge === 'left' ? 'date_from' : 'date_to'}: "${moment(time).format("YYYY-MM-DD")}"}) {
                              id
                            }
                          }`));
                        onRefresh();
                        dragging = false;

                    }}
                    groupRenderer={({ group }) => {
                        return (
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 5, height: '100%' }}>
                                {group.image && <img style={{ width: 35, height: 35, borderRadius: 5, borderWidth: 1, borderColor: colors.text, borderStyle: 'solid', objectFit: 'cover', marginRight: 5 }} src={`https://files.productabot.com/public/${group.image}`} />}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                                    <span style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>{group.name}</span>
                                    <div onClick={() => { navigation.navigate('timeline', { project_id: group.id }) }} style={{ display: 'block', cursor: 'pointer', backgroundColor: '#2196f3', borderRadius: 5, padding: '2px 5px', color: '#ffffff', fontSize: 12, lineHeight: '17px' }}>add +</div>
                                </div>
                            </div>
                        )
                    }}
                    onItemDrag={() => { dragging = true; }}
                    // itemTouchSendsClick={true}
                    itemRenderer={({
                        item,
                        itemContext,
                        getItemProps,
                        getResizeProps
                    }) => {
                        const { left: leftResizeProps, right: rightResizeProps } = getResizeProps()
                        const itemProps = getItemProps(item.itemProps);
                        return (
                            <div {...itemProps} style={{ ...itemProps.style, height: 50, marginTop: -6, lineHeight: 'unset', border: itemContext.selected ? '' : 'none', backgroundColor: '#0055aa' }}
                                onClick={() => { if (!dragging) { navigation.navigate('timeline', { id: item.id, state: { ...item } }) } else { dragging = false } }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextPosition({
                                        x: e.nativeEvent.pageX, y: e.nativeEvent.pageY,
                                        rename: async () => {
                                            let response = prompt('What would you like to rename this timeline to?', item.title);
                                            if (response) {
                                                setItems(items.map((obj) => {
                                                    if (obj.id === item.id) {
                                                        return {
                                                            ...obj,
                                                            title: response
                                                        }
                                                    }
                                                    else {
                                                        return obj;
                                                    }
                                                }));
                                                await API.graphql(graphqlOperation(`mutation {update_timelines_by_pk(pk_columns: {id: "${item.id}"}, _set: {details: "${response}"}) {id}}`));
                                                onRefresh();
                                            }
                                        },
                                        edit: async () => {
                                            navigation.push('timeline', { id: item.id, state: { ...item } });
                                        },
                                        delete: async () => {
                                            if (confirm('Are you sure you want to delete this timeline?')) {
                                                setItems(items.filter(obj => obj.id !== item.id));
                                                await API.graphql(graphqlOperation(`mutation {delete_timelines_by_pk(id: "${item.id}") {id}}`));
                                                onRefresh();
                                            }
                                        }
                                    });
                                }}
                            >
                                <div {...leftResizeProps} style={{ ...leftResizeProps.style, cursor: itemContext.selected ? 'col-resize' : 'pointer' }} />
                                <div
                                    className="rct-item-content"
                                >
                                    {itemContext.title}
                                </div>
                                <div {...rightResizeProps} style={{ ...rightResizeProps.style, cursor: itemContext.selected ? 'col-resize' : 'pointer' }} />
                            </div>
                        )
                    }}>
                    <TimelineHeaders>
                        <DateHeader unit="primaryHeader" />
                        <DateHeader labelFormat={([startTime, endTime], unit, labelWidth) =>
                            `${moment(startTime).format(labelFormat[unit][labelWidth < 50 ? 'short' : labelWidth < 100 ? 'medium' : labelWidth < 150 ? 'mediumLong' : 'long'])}${(unit === 'month' && labelWidth > 50) ? ` Q${moment(startTime).quarter()}` : ''}`
                        } />
                    </TimelineHeaders>
                    <CustomMarker date={new Date()}>
                        {({ styles, date }) => {
                            return <div style={{
                                ...styles,
                                backgroundColor: '#0075ff66',
                                width: '4px'
                            }} onClick={() => { }} />
                        }}
                    </CustomMarker>
                    <CursorMarker>
                        {({ styles, date }) =>
                            <div style={{ ...styles, backgroundColor: colors.border }} />
                        }
                    </CursorMarker>
                </Timeline>}
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    {contextPosition.rename && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.rename();
                    }} ><Text style={{ color: colors.text }}>Rename</Text></TouchableOpacity>}
                    {contextPosition.edit && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.edit();
                    }} ><Text style={{ color: colors.text }}>Edit</Text></TouchableOpacity>}
                    {contextPosition.delete && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.delete();
                    }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>}
                    <TouchableOpacity style={{ padding: 5, width: '100%' }}
                        onPress={() => { menuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
                </MenuOptions>
            </Menu>
        </div>
    );
}