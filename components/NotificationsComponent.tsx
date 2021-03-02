import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, Alert, Text, View, FlatList } from 'react-native';
import * as root from '../Root';
import { LoadingComponent } from '../components/LoadingComponent';
import { API, graphqlOperation } from 'aws-amplify';
import { useFocusEffect } from '@react-navigation/native';
import Popover from '../components/PopoverMenuRenderer';

import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

export default function NotificationsComponent({ route, navigation }: any) {
    const [state, setState] = useState({
        loading: false
    });

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [])
    );

    let onRefresh = async () => {
    }
    return (
        <Menu renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid' } }} >
            <MenuTrigger>
                <View style={{ borderColor: '#ffffff', borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, width: 25 }} >
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>!</Text>
                    <Text style={{ position: 'absolute', top: -10, right: -10, backgroundColor: '#ffffff', color: '#000000', fontSize: 14, height: 20, width: 20, borderRadius: 10, textAlign: 'center' }}>0</Text>
                </View>
            </MenuTrigger>
            <MenuOptions customStyles={{
                optionsWrapper: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid', width: 200, zIndex: 100 }
            }}>
                <FlatList
                    style={{ width: '100%', height: 400 }}
                    numColumns={1}
                    data={Array(60).fill().map((item, i) => `Notification ${i + 1}`)}
                    contentContainerStyle={{ width: '100%' }}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                            <Text style={{ fontSize: 14, width: '100%', color: '#ffffff' }}>{item}</Text>
                        </TouchableOpacity>
                    )}
                    keyExtractor={item => item}
                    refreshControl={
                        <RefreshControl
                            refreshing={state.loading}
                            onRefresh={onRefresh}
                            colors={["#ffffff"]}
                            tintColor='#ffffff'
                            titleColor="#ffffff"
                            title=""
                        />}
                    onEndReached={() => { }}
                    ListEmptyComponent={<View></View>}
                />
            </MenuOptions>
        </Menu>
    );
}