import * as React from 'react';
import { InputAccessoryView, View, Button, Keyboard, Platform } from 'react-native';

export function InputAccessoryViewComponent(props: any) {
    return (
        Platform.OS === 'ios' ?
            <InputAccessoryView nativeID='main'>
                <View style={{ backgroundColor: '#000000', height: 45, borderTopColor: '#444444', borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {props.enterTimestamp ?
                        <Button
                            onPress={() => {
                                props.enterTimestamp();
                            }}
                            title='Timestamp'
                        /> : <View />}
                    <Button
                        onPress={() => { Keyboard.dismiss(); }}
                        title='Done'
                    />
                </View>
            </InputAccessoryView> : <View />
    );
}