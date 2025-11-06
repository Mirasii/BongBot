import path from 'path';
import fs from 'fs';

export default function getRandomFile(dir: string, callback: (err: Error | null, file?: string) => void) {
    fs.readdir(dir, (err, files) => {
        if (err) return callback(err)
        checkRandom();

        function checkRandom() {
            if (!files.length) {
                // callback with an empty string to indicate there are no files
                return callback(null, undefined)
            }
            const randomIndex = Math.floor(Math.random() * files.length)
            const file = files[randomIndex]
            fs.stat(path.join(dir, file), (err, stats) => {
                if (err) return callback(err)
                if (stats.isFile()) {
                    return callback(null, file)
                }
                // remove this file from the array because for some reason it's not a file
                files.splice(randomIndex, 1)
                // try another random one
                checkRandom()
            })
        }
    })
}