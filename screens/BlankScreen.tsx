import * as React from 'react';
import { Text, View } from '../components/Themed';

export default function BlankScreen() {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', }}>
            <Text>This screen intentionally left blank</Text>
        </View>
    );
}