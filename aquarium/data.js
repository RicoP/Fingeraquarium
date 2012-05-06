data = {
    'textures': {
        'fish1': undefined,
        'pinkfish': undefined,
        'fish2': undefined,
        'fish3': undefined,
        'fish4': undefined,
        'seahorse': undefined,
        'jaguarshark': undefined,
        'castle': undefined,
        'seaweed1': undefined,
        'seaweed2': undefined,
        'seaweed3': undefined,
        'sand1': undefined,
        'sand2': undefined,
        'sand3': undefined,
        'skull': undefined,
        'treasure': undefined,
        'food': undefined,
        'bubble': undefined,
		'bg': undefined
    },
    'types': {
        'fish': {
            'fish1': {
                'texture': 'fish1',
                'size': [30, 40],
                'max_age': [3 * 60, 10 * 60],
                'energy': [50, 100],
                'avg_speed': [10, 20],
                'breed_time': [10, 30],
            },

            'pinkfish': {
                'texture': 'pinkfish',
                'size': [30, 40],
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [10, 10],
                'breed_time': [10, 30],
            },
            'fish2': {
                'texture': 'fish2',
                'size': [30, 40],
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [10, 30],
                'breed_time': [10, 30],
            },

            'fish4': {
                'texture': 'fish4',
                'size': [50, 60],
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [10, 30],
                'breed_time': [10, 30],
            },

            'fish3': {
                'texture': 'fish3',
                'size': [30, 40],
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [20, 30],
                'breed_time': [10, 30],
            },

            'seahorse': {
                'texture': 'seahorse',
                'size': [50, 60],
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [10, 20],
                'breed_time': [10, 30],
            },

            'jaguarshark': {
                'texture': 'jaguarshark',
                'size': [50, 80],
                'max_age': [3 * 60, 10 * 60],
                'energy': [100, 100],
                'avg_speed': [20, 30],
                'breed_time': [10, 30],
            },
        },
        'feature': {
            'castle': {
                'texture': 'castle',
                'probability': 0.1,
                'size': [75, 100],
            },
            'treasure': {
                'texture': 'treasure',
                'probability': 0.1,
                'size': [75, 100],
            },
            'skull': {
                'texture': 'skull',
                'probability': 0.1,
                'size': [75, 100],
            },
            'seaweed1': {
                'texture': 'seaweed1',
                'probability': 0.1,
                'size': [75, 100],
            },
            'seaweed2': {
                'texture': 'seaweed2',
                'probability': 0.1,
                'size': [75, 100],
            },
            'seaweed3': {
                'texture': 'seaweed3',
                'probability': 0.1,
                'size': [75, 100],
            },
            'sand1': {
                'texture': 'sand1',
                'probability': 0.1,
                'size': [75, 100],
            },
            'sand2': {
                'texture': 'sand2',
                'probability': 0.1,
                'size': [75, 100],
            },
            'sand3': {
                'texture': 'sand3',
                'probability': 0.1,
                'size': [75, 100],
            },
        },
        'bubble': {
            'small': {
                'texture': 'bubble',
                'size': [10, 20],
                'speed': [15, 30],
            }
        }
		
		
    },
    'scenario': {
        'buttons': {
            'feed': {
                'texture': 'food',
                'pos': [0.85, 0.1],
                'size': 0.15,
                'callback': 'start_food_drag',
            }
        }
    }
    /*this.Features = [
        [0.1, "castle"], [0.5, "seaweed1"], [0.5, "seaweed2"], [0.5, "seaweed3"],
        [0.1, "skull"], [0.1, "treasure"], [1, "sand1"], [1, "sand2"], [1, "sand3"]
    ];*/
}
