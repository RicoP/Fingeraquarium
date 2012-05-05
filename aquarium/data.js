data = {
    'textures': {
        'fish1': undefined,
        'pinkfish': undefined,
        'castle': undefined,
        'seaweed1': undefined,
        'seaweed2': undefined,
        'food': undefined,
    },
    'types': {
        'fish': {
            'fish1': {
                'texture': 'fish1',
                'max_age': [3 * 60, 10 * 60],
                'energy': [50, 100],
                'avg_speed': [10, 20],
                'breed_time': [10, 30],
            },

            'pinkfish': {
                'texture': 'pinkfish',
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [10, 10],
                'breed_time': [10, 30],
            },
        /*
            'fish2': {
                'texture': 'images/fish2.png',
                'min_age':       3 * 60,
                'max_age':       10 * 60,
                'min_energy':    100,
                'max_energy':    100,
                'min_avg_speed': 10,
                'max_avg_speed': 30,
                'min_breedtime': 10,
                'max_breedtime': 30
            },

            'fish4': {
                'texture': 'images/fish4.png',
                'min_age':       3 * 60,
                'max_age':       10 * 60,
                'min_energy':    100,
                'max_energy':    100,
                'min_avg_speed': 10,
                'max_avg_speed': 30,
                'min_breedtime': 10,
                'max_breedtime': 30
            },

            'fish3': {
                'texture': 'images/fish3.png',
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'min_avg_speed': 20,
                'max_avg_speed': 30,
                'min_breedtime': 10,
                'max_breedtime': 30
            },

            'seahorse': {
                'texture': 'images/seahorse.png',
                'min_age':       3 * 60,
                'max_age':       6 * 60,
                'min_energy':    100,
                'max_energy':    100,
                'min_avg_speed': 10,
                'max_avg_speed': 20,
                'min_breedtime': 10,
                'max_breedtime': 30
            },

            'jaguarshark': {
                'texture': 'images/jaguarshark.png',
                'min_age':       3 * 60,
                'max_age':       6 * 60,
                'min_energy':    100,
                'max_energy':    100,
                'min_avg_speed': 20,
                'max_avg_speed': 30,
                'min_breedtime': 10,
                'max_breedtime': 30
            },*/
        },
        'feature': {
            'castle': {
                'texture': 'castle',
                'probability': 0.1,
            },
            'seaweed1': {
                'texture': 'seaweed1',
                'probability': 0.1,
            },
            'seaweed2': {
                'texture': 'seaweed2',
                'probability': 0.1,
            },
        },
        'button': {
            'food': {
                'texture': 'food',
            }
        },
    },
    'scenario': {
        'buttons': {
            'feed': {
                'pos': [0.9, 0.9],
            }
        }
    }
    /*this.Features = [
        [0.1, "castle"], [0.5, "seaweed1"], [0.5, "seaweed2"], [0.5, "seaweed3"],
        [0.1, "skull"], [0.1, "treasure"], [1, "sand1"], [1, "sand2"], [1, "sand3"]
    ];*/
}
