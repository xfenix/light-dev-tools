import React from 'react';

export default function Base64Component(props) {
    return (
        <div className="UserInfo">
            <div className="UserInfo-name">
                {props.user.name}
            </div>
        </div>
    );
}
