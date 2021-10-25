import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, useWindowDimensions, Text, Image } from 'react-native';
import { View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TestScreen({ route, navigation, setLoading }: any) {
    const window = useWindowDimensions();
    const [document, setDocument] = useState('');
    const [editable, setEditable] = useState(true);
    const [touch, setTouch] = useState({});
    const inputRef = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [])
    );

    let onRefresh = async () => {

    }

    return (
        <View style={styles.container}>
            <View style={{ padding: 10, paddingTop: 40, borderColor: '#444444', borderBottomWidth: root.desktopWeb ? 0 : 1, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : '100%' }}>
                <TouchableOpacity onPress={() => {
                    navigation.goBack()
                }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                onTouchStart={(event) => {
                    setTouch(event.nativeEvent);
                }}
                onTouchEnd={(event) => {
                    if (touch.locationY <= event.nativeEvent.locationY + 20 && touch.locationY >= event.nativeEvent.locationY - 20) {
                        setEditable(true);
                        setTimeout(() => { inputRef.current.focus(); }, 0);
                    }
                }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[{ width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : '100%', height: window.height - 150 }]}
            >
                <TextInput spellCheck={false}
                    selectionColor='#ff0000'
                    autoFocus={true}
                    ref={inputRef}
                    //dataDetectorTypes={'all'}
                    editable={editable}
                    inputAccessoryViewID='main'
                    style={[{ width: '100%', height: '100%', color: '#ffffff', padding: 10, fontSize: root.desktopWeb ? 12 : 16, paddingTop: 10, fontFamily: 'droid' }, root.desktopWeb && { outlineWidth: 0, borderColor: '#333333', borderWidth: 1, borderStyle: 'solid' }]}
                    multiline={true}
                    onChangeText={(value) => {
                        setDocument(value);
                    }}
                    selection={{ start: 0, end: 1 }}
                ><Text>{document.split(' ').map(obj => {
                    if (obj.startsWith('#')) {
                        return <Text style={{ fontWeight: '800', color: '#ff0000' }}>{obj}</Text>
                    }
                    else {
                        return <Text style={{ fontWeight: '800' }}>{obj}</Text>
                    }
                })}</Text></TextInput>
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'flex-start'
    }
});
