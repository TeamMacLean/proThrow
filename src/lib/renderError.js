export default function error(err, res) {
    console.error(err);
    if (res) {
        return res.render('error', {error: err});
    }
};