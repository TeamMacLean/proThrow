import Request from '../models/request';
import UUID from '../lib/uuid';
import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import renderError from '../lib/renderError';
import LOG from '../lib/log';
import Util from '../lib/util';
// import moment from 'moment';
import SampleDescription from '../models/sampleDescription';
import SampleImage from '../models/sampleImage';

const index = {};

const transporter = nodemailer.createTransport(smtpTransport({
    host: 'mail.nbi.ac.uk',
    port: 25
}));


function sendEmail(text) {
    transporter.sendMail({
        from: 'prothrow@tsl.ac.uk',
        to: 'martin.page@tsl.ac.uk',
        subject: 'New request (prothrow)',
        text: `${text}\n\n`
    }, (error, info) => {
        if (error) {
            return renderError(err, res);
        } else {
            LOG.success('Message sent:', info.response);
        }
    });
}

index.index = (req, res, next) => {
    res.render('index');
};

index.new = (req, res, next) => res.render('new');

index.newPost = (req, res) => {

    const username = req.user.username;

    UUID.generate(6, uuid => {

        const request = new Request({
            uuid,
            createdBy: username,
            yanCode: Util.generateYanCode(req.user.firstName, req.user.lastName),
            species: req.body.species,
            secondSpecies: req.body.secondSpecies,
            tissue: req.body.tissue,
            tissueAgeNum: req.body.tissueAgeNum,
            tissueAgeType: req.body.tissueAgeType,
            growthConditions: req.body.growthConditions,
            projectDescription: req.body.projectDescription,
            hopedAnalysis: req.body.hopedAnalysis,
            bufferComposition: req.body.bufferComposition,
            analysisType: req.body.analysisType,
            secondaryAnalysisType: req.body.secondaryAnalysisType,
            typeOfPTM: req.body.typeOfPTM,
            quantitativeAnalysisRequired: req.body.quantitativeAnalysisRequired,
            typeOfLabeling: req.body.typeOfLabeling,
            labelUsed: req.body.labelUsed,
            samplePrep: req.body.samplePrep,
            digestion: req.body.digestion,
            enzyme: req.body.enzyme,
            accession: req.body.accession,
            sequenceInfo: req.body.sequenceInfo,
            dbEntry: req.body.dbEntry
        });


        request.save().then(doc => {

            req.body['image[]'].map((img, i) => {
                SampleImage.filter({uid: img}).then(images => {
                    images[0].description = req.body['imageDescription[]'][i];
                    images[0].requestID = request.id;
                    images[0].save().then(saved => {
                    });
                }).error(err => {
                    console.error(err);
                })

            });

            req.body['sampleDescription[]'].map((sd, i) => {

                const number = req.body['sampleNumber[]'][i];

                const newSD = new SampleDescription({
                    requestID: request.id,
                    position: i,
                    sampleNumber: number,
                    sampleDescription: sd
                });

                newSD.save().then(saved => {

                });

            });


            sendEmail(`new job, ${uuid}`);
            res.render('newPost', {uuid: doc.uuid});
        }).error(err => renderError(err, res));
    });
};


export default index;
