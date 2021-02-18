import React, { useState } from 'react';
import { Text, View } from '../components/Themed';
import { Auth } from "aws-amplify";
import { TouchableOpacity } from 'react-native';
import { LoadingComponent } from '../components/LoadingComponent';

export default function SettingsScreen({ navigation }: any) {
    const [state, setState] = useState({
        loading: false
    });
    let logout = async () => {
        setState({ ...state, loading: true });
        await Auth.signOut();
        setState({ ...state, loading: false });
        navigation.navigate('auth');
    }
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', }}>
            <TouchableOpacity onPress={logout}>
                <Text>Log Out</Text>
            </TouchableOpacity>
            {state.loading && <LoadingComponent />}
        </View>
    );
}