import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, useWindowDimensions, Text, Image } from 'react-native';
import { View } from '../components/Themed';
import { useFocusEffect } from '@react-navigation/native';

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
            <div style={{ height: 100 }} />
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
